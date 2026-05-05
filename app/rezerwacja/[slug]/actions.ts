"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceBySlug, getBusinessHours } from "@/lib/db/services";
import { getBookingsInRange, createBooking, getBusyStaffIds, getGroupBookingCount } from "@/lib/db/bookings";
import { computeAvailableSlots, addDays, applyStaffHours } from "@/lib/slots";
import { getActiveStaff } from "@/lib/db/staff";
import { getStaffAvailabilityMap } from "@/lib/db/staff-schedule";
import type { Slot } from "@/lib/slots";
import { sendEmail } from "@/lib/email/send";
import { buildConfirmationEmail } from "@/lib/email/booking-confirmation";
import { buildOwnerNotificationEmail } from "@/lib/email/owner-notification";
import { getSettings } from "@/lib/db/settings";
import { signBookingToken } from "@/lib/booking-token";
import { recordBookingEvent } from "@/lib/db/booking-events";
import { resolveEffectivePricing } from "@/lib/db/staff-groups";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bad date format");

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

  // Destructure early so inner helpers have definite types (no `parsed.data` narrowing issue).
  const {
    serviceSlug: parsedServiceSlug,
    startsAtIso,
    staffId: parsedStaffId,
    customerName,
    customerPhone,
    customerEmail,
    notes,
  } = parsed.data;

  const [service, settings] = await Promise.all([
    getServiceBySlug(parsedServiceSlug),
    getSettings(),
  ]);
  if (!service) {
    return { status: "error", message: "Usługa nie istnieje." };
  }

  const startsAt = new Date(startsAtIso);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  function sendBookingEmails(
    bookingId: string,
    endsAt: Date,
    pricePln: number,
    staffName: string | null
  ) {
    if (customerEmail) {
      const cancelToken = signBookingToken(bookingId, "cancel");
      const rescheduleToken = signBookingToken(bookingId, "reschedule");
      const { subject, html, text } = buildConfirmationEmail({
        bookingId,
        customerName,
        serviceName: service!.name,
        startsAtIso: startsAt.toISOString(),
        endsAtIso: endsAt.toISOString(),
        pricePln,
        notes: notes ?? null,
        business: {
          name: settings.business_name,
          addressStreet: settings.address_street,
          addressPostal: settings.address_postal,
          addressCity: settings.address_city,
          phone: settings.phone,
        },
        cancelUrl: `${siteUrl}/rezerwacja/anuluj/${cancelToken}`,
        rescheduleUrl: `${siteUrl}/rezerwacja/zmien/${rescheduleToken}`,
      });
      sendEmail({ to: customerEmail, subject, html, text }).catch(
        (err) => console.error("[email] Failed to send confirmation:", err)
      );
    }
    if (settings.email) {
      const { subject, html, text } = buildOwnerNotificationEmail({
        bookingId,
        customerName,
        customerPhone,
        customerEmail: customerEmail ?? null,
        serviceName: service!.name,
        staffName,
        startsAtIso: startsAt.toISOString(),
        endsAtIso: endsAt.toISOString(),
        pricePln,
        notes: notes ?? null,
        businessName: settings.business_name,
        adminUrl: `${siteUrl}/admin/harmonogram`,
      });
      sendEmail({ to: settings.email, subject, html, text }).catch(() => {});
    }
  }

  // ── Group class: server-side capacity check ──────────────────────────────────
  if (service.is_group && service.max_participants) {
    const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);
    const booked = await getGroupBookingCount(service.id, startsAt.toISOString(), endsAt.toISOString());
    if (booked >= service.max_participants) {
      return { status: "error", message: "Brak wolnych miejsc w tym terminie. Wybierz inny." };
    }
    const result = await createBooking({
      serviceId: service.id,
      customerName: customerName,
      customerPhone: customerPhone,
      customerEmail: customerEmail ?? null,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      notes: notes ?? null,
      staffId: null,
      pricePlnSnapshot: service.price_pln,
      durationMinSnapshot: service.duration_min,
    });
    if (!result.ok) return { status: "error", message: result.message };
    await recordBookingEvent({
      bookingId: result.id,
      eventType: "created",
      source: "customer",
      customerName: customerName,
      serviceName: service.name,
      startsAtIso: startsAt.toISOString(),
    });
    sendBookingEmails(result.id, endsAt, service.price_pln, null);
    redirect(`/rezerwacja/sukces/${result.id}`);
  }

  // ── Individual service ────────────────────────────────────────────────────────
  let resolvedStaffId: string | null = parsedStaffId ?? null;
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
    customerName: customerName,
    customerPhone: customerPhone,
    customerEmail: customerEmail ?? null,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: endsAt.toISOString(),
    notes: notes ?? null,
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
    customerName: customerName,
    serviceName: service.name,
    startsAtIso: startsAt.toISOString(),
  });

  const staffName = resolvedStaffId
    ? (await getActiveStaff()).find((st) => st.id === resolvedStaffId)?.name ?? null
    : null;
  sendBookingEmails(result.id, endsAt, effectivePrice, staffName);

  redirect(`/rezerwacja/sukces/${result.id}`);
}
