"use server";

import { redirect } from "next/navigation";
import { verifyBookingToken } from "@/lib/booking-token";
import { signBookingToken } from "@/lib/booking-token";
import { getBookingById, createBooking } from "@/lib/db/bookings";
import { getServiceBySlug, getBusinessHours } from "@/lib/db/services";
import { getBookingsInRange, } from "@/lib/db/bookings";
import { computeAvailableSlots, addDays } from "@/lib/slots";
import { getActiveStaff } from "@/lib/db/staff";
import { getStaffAvailabilityMap } from "@/lib/db/staff-schedule";
import { getSettings } from "@/lib/db/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { buildConfirmationEmail } from "@/lib/email/booking-confirmation";
import { recordBookingEvent } from "@/lib/db/booking-events";
import type { Slot } from "@/lib/slots";
import type { BusinessHours } from "@/lib/types";

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

export async function getSlotsForReschedule(
  serviceSlug: string,
  dateStr: string,
  staffId?: string | null,
  rescheduleToken?: string
): Promise<{ ok: true; slots: Slot[] } | { ok: false; message: string }> {
  const service = await getServiceBySlug(serviceSlug);
  if (!service) return { ok: false, message: "Usługa nie istnieje." };

  // If we have a token, derive the booking id so we can exclude it from busy-slot calc.
  const excludeId = rescheduleToken
    ? verifyBookingToken(rescheduleToken, "reschedule") ?? undefined
    : undefined;

  const [hours, settings, activeStaff] = await Promise.all([
    getBusinessHours(),
    getSettings(),
    getActiveStaff(),
  ]);
  const dayEndUtc = new Date(`${addDays(dateStr, 1)}T00:00:00Z`).toISOString();
  const dayStartUtc = new Date(`${dateStr}T00:00:00Z`).toISOString();

  const availMap = await getStaffAvailabilityMap(activeStaff.map((s) => s.id), dateStr);

  if (staffId) {
    const avail = availMap.get(staffId);
    if (avail && !avail.available) return { ok: true, slots: [] };
    const effectiveHours = applyStaffHours(hours, dateStr, avail ?? null);
    const existing = await getBookingsInRange(dayStartUtc, dayEndUtc, staffId, excludeId);
    const slots = computeAvailableSlots(dateStr, service.duration_min, effectiveHours, existing, settings.slot_granularity_min, 1, true);
    return { ok: true, slots };
  }

  const availableStaff = activeStaff.filter((s) => availMap.get(s.id)?.available !== false);
  const staffCount = Math.max(1, availableStaff.length);
  const existing = await getBookingsInRange(dayStartUtc, dayEndUtc, undefined, excludeId);
  const slots = computeAvailableSlots(dateStr, service.duration_min, hours, existing, settings.slot_granularity_min, staffCount, true);
  return { ok: true, slots };
}

export async function rescheduleBookingAction(formData: FormData) {
  const token = formData.get("token")?.toString() ?? "";
  const bookingId = verifyBookingToken(token, "reschedule");
  if (!bookingId) throw new Error("Nieprawidłowy link.");

  const startsAtIso = formData.get("startsAtIso")?.toString();
  if (!startsAtIso) throw new Error("Brak wybranego terminu.");

  const booking = await getBookingById(bookingId);
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

  // Create new booking
  const result = await createBooking({
    serviceId: booking.service_id,
    customerName: booking.customer_name,
    customerPhone: booking.customer_phone,
    customerEmail: booking.customer_email,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: endsAt.toISOString(),
    notes: booking.notes,
    staffId: booking.staff_id,
  });

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
    const s = await getSettings();
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
