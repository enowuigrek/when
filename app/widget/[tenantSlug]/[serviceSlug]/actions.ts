"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantIdBySlug } from "@/lib/tenant";
import {
  getServiceBySlugForTenant,
  getBusinessHoursForTenant,
  getActiveStaffForTenant,
  getSettingsForTenant,
  getBookingsInRangeForTenant,
  createBookingForTenant,
  getStaffAvailabilityMapForTenant,
} from "@/lib/db/for-tenant";
import { computeAvailableSlots, addDays } from "@/lib/slots";
import { signBookingToken } from "@/lib/booking-token";
import { sendEmail } from "@/lib/email/send";
import { buildConfirmationEmail } from "@/lib/email/booking-confirmation";
import { buildOwnerNotificationEmail } from "@/lib/email/owner-notification";
import { sendPushToTenant } from "@/lib/push";
import { createTransaction, tpayConfigured } from "@/lib/tpay";
import { recordBookingEvent } from "@/lib/db/booking-events";
import type { Slot } from "@/lib/slots";
import type { BusinessHours } from "@/lib/types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bad date");

function warsawDate(instant: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

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

export async function getWidgetSlots(
  tenantSlug: string,
  serviceSlug: string,
  dateStr: string,
  staffId?: string | null
): Promise<{ ok: true; slots: Slot[] } | { ok: false; message: string }> {
  if (!dateSchema.safeParse(dateStr).success) return { ok: false, message: "Niepoprawna data." };
  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) return { ok: false, message: "Nieznany salon." };

  const service = await getServiceBySlugForTenant(serviceSlug, tenantId);
  if (!service) return { ok: false, message: "Usługa nie istnieje." };

  const [hours, settings, activeStaff] = await Promise.all([
    getBusinessHoursForTenant(tenantId),
    getSettingsForTenant(tenantId),
    getActiveStaffForTenant(tenantId),
  ]);

  const dayStart = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const dayEnd = new Date(`${addDays(dateStr, 1)}T00:00:00Z`).toISOString();
  const availMap = await getStaffAvailabilityMapForTenant(activeStaff.map((s) => s.id), dateStr, tenantId);

  if (staffId) {
    const avail = availMap.get(staffId);
    if (avail && !avail.available) return { ok: true, slots: [] };
    const effectiveHours = applyStaffHours(hours, dateStr, avail ?? null);
    const existing = await getBookingsInRangeForTenant(dayStart, dayEnd, tenantId, staffId);
    return { ok: true, slots: computeAvailableSlots(dateStr, service.duration_min, effectiveHours, existing, settings.slot_granularity_min, 1, true) };
  }

  const availableStaff = activeStaff.filter((s) => availMap.get(s.id)?.available !== false);
  const staffCount = Math.max(1, availableStaff.length);
  const existing = await getBookingsInRangeForTenant(dayStart, dayEnd, tenantId);
  return { ok: true, slots: computeAvailableSlots(dateStr, service.duration_min, hours, existing, settings.slot_granularity_min, staffCount, true) };
}

const bookingSchema = z.object({
  tenantSlug: z.string().min(1),
  serviceSlug: z.string().min(1),
  startsAtIso: z.string().datetime(),
  staffId: z.string().optional(),
  customerName: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  customerPhone: z.string().trim().min(6, "Podaj numer telefonu").max(30),
  customerEmail: z.string().trim().email("Niepoprawny email").optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(500).optional(),
});

export type WidgetBookingState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function submitWidgetBooking(
  _prev: WidgetBookingState,
  formData: FormData
): Promise<WidgetBookingState> {
  const raw = {
    tenantSlug: formData.get("tenantSlug")?.toString() ?? "",
    serviceSlug: formData.get("serviceSlug")?.toString() ?? "",
    startsAtIso: formData.get("startsAtIso")?.toString() ?? "",
    staffId: formData.get("staffId")?.toString() || undefined,
    customerName: formData.get("customerName")?.toString() ?? "",
    customerPhone: formData.get("customerPhone")?.toString() ?? "",
    customerEmail: formData.get("customerEmail")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  };
  const isEmbed = formData.get("embed")?.toString() === "1";

  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź dane.", fieldErrors };
  }

  const tenantId = await getTenantIdBySlug(parsed.data.tenantSlug);
  if (!tenantId) return { status: "error", message: "Nieznany salon." };

  const service = await getServiceBySlugForTenant(parsed.data.serviceSlug, tenantId);
  if (!service) return { status: "error", message: "Usługa nie istnieje." };

  const startsAt = new Date(parsed.data.startsAtIso);
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);

  let resolvedStaffId: string | null = parsed.data.staffId ?? null;
  if (!service.is_group) {
    const activeStaff = await getActiveStaffForTenant(tenantId);
    if (!resolvedStaffId && activeStaff.length > 0) {
      const dateStr = warsawDate(startsAt);
      const availMap = await getStaffAvailabilityMapForTenant(
        activeStaff.map((s) => s.id),
        dateStr,
        tenantId
      );

      for (const staff of activeStaff) {
        if (availMap.get(staff.id)?.available === false) continue;
        const existing = await getBookingsInRangeForTenant(
          startsAt.toISOString(),
          endsAt.toISOString(),
          tenantId,
          staff.id
        );
        if (existing.length === 0) {
          resolvedStaffId = staff.id;
          break;
        }
      }
    }

    if (activeStaff.length > 0 && !resolvedStaffId) {
      return { status: "error", message: "Ten termin właśnie zajęto. Wybierz inny." };
    }
  }

  // Determine if payment is required
  const requiresPayment =
    service.payment_mode !== "none" && tpayConfigured();
  const paymentAmountPln =
    service.payment_mode === "deposit" && service.deposit_amount_pln != null
      ? service.deposit_amount_pln
      : service.price_pln;

  const result = await createBookingForTenant(
    {
      serviceId: service.id,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerEmail: parsed.data.customerEmail ?? null,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      notes: parsed.data.notes ?? null,
      staffId: resolvedStaffId,
      pricePlnSnapshot: service.price_pln,
      durationMinSnapshot: service.duration_min,
      // pending_payment if Tpay required, else confirmed immediately
      status: requiresPayment ? "pending_payment" : "confirmed",
    },
    tenantId
  );

  if (!result.ok) {
    if (result.error === "slot_taken") return { status: "error", message: "Ten termin właśnie zajęto. Wybierz inny." };
    return { status: "error", message: `Błąd: ${result.message}` };
  }

  await recordBookingEvent({
    bookingId: result.id,
    eventType: "created",
    source: "customer",
    customerName: parsed.data.customerName,
    serviceName: service.name,
    startsAtIso: startsAt.toISOString(),
    tenantId,
  });

  const settings = await getSettingsForTenant(tenantId);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // ── Payment required → redirect to Tpay ──────────────────────────────────
  if (requiresPayment) {
    try {
      const txn = await createTransaction({
        amountPln: paymentAmountPln * 100, // convert to grosze
        description: `${service.name} — ${settings.business_name}`,
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail || null,
        bookingId: result.id,
        successUrl: `${siteUrl}/rezerwacja/sukces/${result.id}${isEmbed ? "?embed=1" : ""}`,
        errorUrl: `${siteUrl}/rezerwacja/platnosc/blad?booking=${result.id}`,
        notifyUrl: `${siteUrl}/api/payments/tpay/notify`,
      });
      redirect(txn.paymentUrl);
    } catch (err) {
      console.error("[tpay] createTransaction failed", err);
      // Tpay unavailable — cancel the pending booking and show error
      const { createAdminClient } = await import("@/lib/supabase/admin");
      await createAdminClient()
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", result.id);
      return { status: "error", message: "Błąd płatności. Spróbuj ponownie lub zadzwoń do salonu." };
    }
  }

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
        name: settings.business_name,
        addressStreet: settings.address_street,
        addressPostal: settings.address_postal,
        addressCity: settings.address_city,
        phone: settings.phone,
      },
      cancelUrl: `${siteUrl}/rezerwacja/anuluj/${cancelToken}`,
      rescheduleUrl: `${siteUrl}/rezerwacja/zmien/${rescheduleToken}`,
    });
    sendEmail({ to: parsed.data.customerEmail, subject, html, text }).catch(() => {});
  }

  // Notify owner (fire-and-forget)
  if (settings.email) {
    const staffName = resolvedStaffId
      ? (await getActiveStaffForTenant(tenantId)).find((staff) => staff.id === resolvedStaffId)?.name ?? null
      : null;
    const { subject, html, text } = buildOwnerNotificationEmail({
      bookingId: result.id,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerEmail: parsed.data.customerEmail || null,
      serviceName: service.name,
      staffName,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      pricePln: service.price_pln,
      notes: parsed.data.notes ?? null,
      businessName: settings.business_name,
      adminUrl: `${siteUrl}/admin/harmonogram`,
    });
    sendEmail({ to: settings.email, subject, html, text }).catch(() => {});
  }

  // Push notification to owner's devices (fire-and-forget)
  sendPushToTenant(tenantId, {
    title: "Nowa rezerwacja",
    body: `${parsed.data.customerName} · ${service.name}`,
    url: "/admin/harmonogram",
    tag: "booking-new",
  }).catch(() => {});

  revalidatePath("/admin/harmonogram");
  revalidatePath("/admin");

  redirect(`/rezerwacja/sukces/${result.id}${isEmbed ? "?embed=1" : ""}`);
}
