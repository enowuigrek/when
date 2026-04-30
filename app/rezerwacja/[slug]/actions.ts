"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceBySlug, getBusinessHours } from "@/lib/db/services";
import { getBookingsInRange, createBooking, getBusyStaffIds, getGroupBookingCount } from "@/lib/db/bookings";
import { computeAvailableSlots, addDays } from "@/lib/slots";
import { getActiveStaff } from "@/lib/db/staff";
import { getStaffAvailabilityMap } from "@/lib/db/staff-schedule";
import type { Slot } from "@/lib/slots";
import type { BusinessHours } from "@/lib/types";
import { sendEmail } from "@/lib/email/send";
import { buildConfirmationEmail } from "@/lib/email/booking-confirmation";
import { buildOwnerNotificationEmail } from "@/lib/email/owner-notification";
import { getSettings } from "@/lib/db/settings";
import { signBookingToken } from "@/lib/booking-token";
import { recordBookingEvent } from "@/lib/db/booking-events";
import { resolveEffectivePricing } from "@/lib/db/staff-groups";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bad date format");

function applyStaffHours(
  hours: BusinessHours[],
  dateStr: string,
  avail: { startTime: string | null; endTime: string | null } | null
): BusinessHours[] {
  if (!avail?.startTime || !avail?.endTime) return hours;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return hours.map((h) =>
    h.day_of_week === dayOfWeek
      ? { ...h, open_time: avail.startTime! + ":00", close_time: avail.endTime! + ":00", closed: false }
      : h
  );
}

export async function getSlotsForDate(
  serviceSlug: string,
  dateStr: string,
  staffId?: string | null
): Promise<{ ok: true; slots: Slot[] } | { ok: false; message: string }> {
  const dateRes = dateSchema.safeParse(dateStr);
  if (!dateRes.success) return { ok: false, message: "Niepoprawna data." };

  const service = await getServiceBySlug(serviceSlug);
  if (!service) return { ok: false, message: "Usługa nie istnieje." };

  const [hours, settings, activeStaff] = await Promise.all([getBusinessHours(), getSettings(), getActiveStaff()]);
  const dayStartUtc = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const dayEndUtc = new Date(`${addDays(dateStr, 1)}T00:00:00Z`).toISOString();

  // ── Group class: count all bookings for this service (not per-staff) ────────
  if (service.is_group && service.max_participants) {
    const existing = await getBookingsInRange(dayStartUtc, dayEndUtc, undefined, undefined);
    // Filter to this service only (getBookingsInRange returns all confirmed bookings)
    // We need service-scoped count — use all bookings for now (conservative, safe)
    const slots = computeAvailableSlots(
      dateStr, service.duration_min, hours, existing,
      settings.slot_granularity_min, 1, true, service.max_participants
    );
    return { ok: true, slots };
  }

  const availMap = await getStaffAvailabilityMap(activeStaff.map((s) => s.id), dateStr);

  if (staffId) {
    const avail = availMap.get(staffId);
    if (avail && !avail.available) return { ok: true, slots: [] };

    // Override business hours with this staff's personal schedule if set
    const effectiveHours = applyStaffHours(hours, dateStr, avail ?? null);
    const existing = await getBookingsInRange(dayStartUtc, dayEndUtc, staffId);
    const slots = computeAvailableSlots(dateStr, service.duration_min, effectiveHours, existing, settings.slot_granularity_min, 1, true);
    return { ok: true, slots };
  }

  // "Dowolny" — count only staff available today
  const availableStaff = activeStaff.filter((s) => availMap.get(s.id)?.available !== false);
  const staffCount = Math.max(1, availableStaff.length);
  const existing = await getBookingsInRange(dayStartUtc, dayEndUtc);
  const slots = computeAvailableSlots(dateStr, service.duration_min, hours, existing, settings.slot_granularity_min, staffCount, true);
  return { ok: true, slots };
}

const bookingSchema = z.object({
  serviceSlug: z.string().min(1),
  startsAtIso: z.string().datetime(),
  staffId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  customerName: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  customerPhone: z
    .string()
    .trim()
    .min(7, "Numer telefonu wygląda za krótko")
    .max(30),
  customerEmail: z
    .string()
    .trim()
    .email("Niepoprawny email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(500).optional(),
});

export type BookingFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function submitBooking(
  _prev: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const raw = {
    serviceSlug: formData.get("serviceSlug")?.toString() ?? "",
    startsAtIso: formData.get("startsAtIso")?.toString() ?? "",
    staffId: formData.get("staffId")?.toString() ?? "",
    customerName: formData.get("customerName")?.toString() ?? "",
    customerPhone: formData.get("customerPhone")?.toString() ?? "",
    customerEmail: formData.get("customerEmail")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  };

  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      message: "Sprawdź dane w formularzu.",
      fieldErrors,
    };
  }

  const service = await getServiceBySlug(parsed.data.serviceSlug);
  if (!service) {
    return { status: "error", message: "Usługa nie istnieje." };
  }

  const startsAt = new Date(parsed.data.startsAtIso);

  // ── Group class: server-side capacity check ──────────────────────────────────
  if (service.is_group && service.max_participants) {
    const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);
    const booked = await getGroupBookingCount(service.id, startsAt.toISOString(), endsAt.toISOString());
    if (booked >= service.max_participants) {
      return { status: "error", message: "Brak wolnych miejsc w tym terminie. Wybierz inny." };
    }
    // Group bookings don't auto-assign staff
    const result = await createBooking({
      serviceId: service.id,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerEmail: parsed.data.customerEmail ?? null,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      notes: parsed.data.notes ?? null,
      staffId: null,
      pricePlnSnapshot: service.price_pln,
      durationMinSnapshot: service.duration_min,
    });
    if (!result.ok) return { status: "error", message: result.message };
    await recordBookingEvent({
      bookingId: result.id,
      eventType: "created",
      source: "customer",
      customerName: parsed.data.customerName,
      serviceName: service.name,
      startsAtIso: startsAt.toISOString(),
    });
    const s = await getSettings();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    if (parsed.data.customerEmail) {
      const cancelToken = signBookingToken(result.id, "cancel");
      const rescheduleToken = signBookingToken(result.id, "reschedule");
      const { subject, html, text } = buildConfirmationEmail({
        bookingId: result.id,
        customerName: parsed.data.customerName,
        serviceName: service.name,
        startsAtIso: startsAt.toISOString(),
        endsAtIso: endsAt.toISOString(),
        pricePln: service.price_pln,
        notes: parsed.data.notes ?? null,
        business: {
          name: s.business_name,
          addressStreet: s.address_street,
          addressPostal: s.address_postal,
          addressCity: s.address_city,
          phone: s.phone,
        },
        cancelUrl: `${siteUrl}/rezerwacja/anuluj/${cancelToken}`,
        rescheduleUrl: `${siteUrl}/rezerwacja/zmien/${rescheduleToken}`,
      });
      sendEmail({ to: parsed.data.customerEmail, subject, html, text }).catch(
        (err) => console.error("[email] Failed to send confirmation:", err)
      );
    }
    // Owner notification
    if (s.email) {
      const { subject, html, text } = buildOwnerNotificationEmail({
        bookingId: result.id,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        customerEmail: parsed.data.customerEmail ?? null,
        serviceName: service.name,
        staffName: null,
        startsAtIso: startsAt.toISOString(),
        endsAtIso: endsAt.toISOString(),
        pricePln: service.price_pln,
        notes: parsed.data.notes ?? null,
        businessName: s.business_name,
        adminUrl: `${siteUrl}/admin/harmonogram`,
      });
      sendEmail({ to: s.email, subject, html, text }).catch(() => {});
    }
    redirect(`/rezerwacja/sukces/${result.id}`);
  }

  // Auto-assign staff when client selected "Dowolny"
  let resolvedStaffId: string | null = parsed.data.staffId ?? null;
  if (!resolvedStaffId) {
    const fallbackEnd = new Date(startsAt.getTime() + service.duration_min * 60_000);
    const [busyIds, allStaff] = await Promise.all([
      getBusyStaffIds(startsAt.toISOString(), fallbackEnd.toISOString()),
      getActiveStaff(),
    ]);
    const free = allStaff.filter((s) => !busyIds.includes(s.id));
    resolvedStaffId = free[0]?.id ?? null;
  }

  const pricing = await resolveEffectivePricing(service.id, resolvedStaffId);
  const effectiveDuration = pricing?.duration_min ?? service.duration_min;
  const effectivePrice = pricing?.price_pln ?? service.price_pln;
  const endsAt = new Date(startsAt.getTime() + effectiveDuration * 60_000);

  const result = await createBooking({
    serviceId: service.id,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    customerEmail: parsed.data.customerEmail ?? null,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: endsAt.toISOString(),
    notes: parsed.data.notes ?? null,
    staffId: resolvedStaffId,
    pricePlnSnapshot: effectivePrice,
    durationMinSnapshot: effectiveDuration,
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  await recordBookingEvent({
    bookingId: result.id,
    eventType: "created",
    source: "customer",
    customerName: parsed.data.customerName,
    serviceName: service.name,
    startsAtIso: startsAt.toISOString(),
  });

  // Send confirmation email — fire-and-forget, never blocks booking.
  const s2 = await getSettings();
  const siteUrl2 = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (parsed.data.customerEmail) {
    const cancelToken = signBookingToken(result.id, "cancel");
    const rescheduleToken = signBookingToken(result.id, "reschedule");
    const { subject, html, text } = buildConfirmationEmail({
      bookingId: result.id,
      customerName: parsed.data.customerName,
      serviceName: service.name,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      pricePln: effectivePrice,
      notes: parsed.data.notes ?? null,
      business: {
        name: s2.business_name,
        addressStreet: s2.address_street,
        addressPostal: s2.address_postal,
        addressCity: s2.address_city,
        phone: s2.phone,
      },
      cancelUrl: `${siteUrl2}/rezerwacja/anuluj/${cancelToken}`,
      rescheduleUrl: `${siteUrl2}/rezerwacja/zmien/${rescheduleToken}`,
    });
    sendEmail({ to: parsed.data.customerEmail, subject, html, text }).catch(
      (err) => console.error("[email] Failed to send confirmation:", err)
    );
  }
  // Owner notification
  if (s2.email) {
    const staffName = resolvedStaffId
      ? (await getActiveStaff()).find((st) => st.id === resolvedStaffId)?.name ?? null
      : null;
    const { subject, html, text } = buildOwnerNotificationEmail({
      bookingId: result.id,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerEmail: parsed.data.customerEmail ?? null,
      serviceName: service.name,
      staffName,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      pricePln: effectivePrice,
      notes: parsed.data.notes ?? null,
      businessName: s2.business_name,
      adminUrl: `${siteUrl2}/admin/harmonogram`,
    });
    sendEmail({ to: s2.email, subject, html, text }).catch(() => {});
  }

  redirect(`/rezerwacja/sukces/${result.id}`);
}
