"use server";

import { redirect } from "next/navigation";
import { verifyBookingToken } from "@/lib/booking-token";
import { signBookingToken } from "@/lib/booking-token";
import {
  getBookingByIdPublic,
  getServiceBySlugForTenant,
  getBusinessHoursForTenant,
  getBookingsInRangeForTenant,
  getActiveStaffForTenant,
  getStaffAvailabilityMapForTenant,
  getSettingsForTenant,
  createBookingForTenant,
} from "@/lib/db/for-tenant";
import { computeAvailableSlots, addDays, applyStaffHours } from "@/lib/slots";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { buildConfirmationEmail } from "@/lib/email/booking-confirmation";
import { recordBookingEvent } from "@/lib/db/booking-events";
import type { Slot } from "@/lib/slots";

export async function getSlotsForReschedule(
  serviceSlug: string,
  dateStr: string,
  staffId?: string | null,
  rescheduleToken?: string
): Promise<{ ok: true; slots: Slot[] } | { ok: false; message: string }> {
  // Token is required to know which tenant we're operating on.
  if (!rescheduleToken) return { ok: false, message: "Brak tokena." };
  const excludeId = verifyBookingToken(rescheduleToken, "reschedule");
  if (!excludeId) return { ok: false, message: "Nieprawidłowy token." };

  const booking = await getBookingByIdPublic(excludeId);
  if (!booking) return { ok: false, message: "Rezerwacja nie istnieje." };
  const tid = booking.tenant_id;

  const service = await getServiceBySlugForTenant(serviceSlug, tid);
  if (!service) return { ok: false, message: "Usługa nie istnieje." };

  const [hours, settings, activeStaff] = await Promise.all([
    getBusinessHoursForTenant(tid),
    getSettingsForTenant(tid),
    getActiveStaffForTenant(tid),
  ]);
  const dayEndUtc = new Date(`${addDays(dateStr, 1)}T00:00:00Z`).toISOString();
  const dayStartUtc = new Date(`${dateStr}T00:00:00Z`).toISOString();

  const availMap = await getStaffAvailabilityMapForTenant(activeStaff.map((s) => s.id), dateStr, tid);

  if (staffId) {
    const avail = availMap.get(staffId);
    if (avail && !avail.available) return { ok: true, slots: [] };
    const effectiveHours = applyStaffHours(hours, dateStr, avail ?? null);
    const existing = await getBookingsInRangeForTenant(dayStartUtc, dayEndUtc, tid, staffId, excludeId);
    const slots = computeAvailableSlots(dateStr, service.duration_min, effectiveHours, existing, settings.slot_granularity_min, 1, true);
    return { ok: true, slots };
  }

  const availableStaff = activeStaff.filter((s) => availMap.get(s.id)?.available !== false);
  const staffCount = Math.max(1, availableStaff.length);
  const existing = await getBookingsInRangeForTenant(dayStartUtc, dayEndUtc, tid, undefined, excludeId);
  const slots = computeAvailableSlots(dateStr, service.duration_min, hours, existing, settings.slot_granularity_min, staffCount, true);
  return { ok: true, slots };
}

export async function rescheduleBookingAction(formData: FormData) {
  const token = formData.get("token")?.toString() ?? "";
  const bookingId = verifyBookingToken(token, "reschedule");
  if (!bookingId) throw new Error("Nieprawidłowy link.");

  const startsAtIso = formData.get("startsAtIso")?.toString();
  if (!startsAtIso) throw new Error("Brak wybranego terminu.");

  const booking = await getBookingByIdPublic(bookingId);
  if (!booking || booking.status !== "confirmed") {
    redirect("/rezerwacja/anuluj/blad");
  }
  if (new Date(booking.starts_at) <= new Date()) {
    redirect("/rezerwacja/anuluj/blad");
  }

  const service = (booking as { service?: { name: string; slug: string; duration_min: number; price_pln: number } }).service;
  if (!service) throw new Error("Brak usługi.");

  const startsAt = new Date(startsAtIso);
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);

  // Cancel old booking
  await createAdminClient()
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  // Create new booking — for the same tenant as the original
  const result = await createBookingForTenant({
    serviceId: booking.service_id,
    customerName: booking.customer_name,
    customerPhone: booking.customer_phone,
    customerEmail: booking.customer_email,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: endsAt.toISOString(),
    notes: booking.notes,
    staffId: booking.staff_id,
  }, booking.tenant_id);

  if (!result.ok) throw new Error(result.message);

  await recordBookingEvent({
    bookingId: result.id,
    eventType: "rescheduled",
    source: "customer",
    customerName: booking.customer_name,
    serviceName: service.name,
    startsAtIso: startsAt.toISOString(),
  });

  // Send confirmation for new booking
  if (booking.customer_email) {
    const s = await getSettingsForTenant(booking.tenant_id);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const newCancelToken = signBookingToken(result.id, "cancel");
    const newRescheduleToken = signBookingToken(result.id, "reschedule");
    const { subject, html, text } = buildConfirmationEmail({
      bookingId: result.id,
      customerName: booking.customer_name,
      serviceName: service.name,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      pricePln: service.price_pln,
      notes: booking.notes,
      business: {
        name: s.business_name,
        logoUrl: s.logo_url,
        addressStreet: s.address_street,
        addressPostal: s.address_postal,
        addressCity: s.address_city,
        phone: s.phone,
      },
      cancelUrl: `${siteUrl}/rezerwacja/anuluj/${newCancelToken}`,
      rescheduleUrl: `${siteUrl}/rezerwacja/zmien/${newRescheduleToken}`,
    });
    sendEmail({ to: booking.customer_email, subject, html, text }).catch(() => {});
  }

  redirect(`/rezerwacja/sukces/${result.id}`);
}
