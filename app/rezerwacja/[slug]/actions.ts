"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceBySlug, getBusinessHours } from "@/lib/db/services";
import { getBookingsInRange, createBooking } from "@/lib/db/bookings";
import { computeAvailableSlots, addDays } from "@/lib/slots";
import { getActiveStaff } from "@/lib/db/staff";
import type { Slot } from "@/lib/slots";
import { sendEmail } from "@/lib/email/send";
import { buildConfirmationEmail } from "@/lib/email/booking-confirmation";
import { getSettings } from "@/lib/db/settings";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bad date format");

export async function getSlotsForDate(
  serviceSlug: string,
  dateStr: string
): Promise<{ ok: true; slots: Slot[] } | { ok: false; message: string }> {
  const dateRes = dateSchema.safeParse(dateStr);
  if (!dateRes.success) return { ok: false, message: "Niepoprawna data." };

  const service = await getServiceBySlug(serviceSlug);
  if (!service) return { ok: false, message: "Usługa nie istnieje." };

  const [hours, settings, activeStaff] = await Promise.all([getBusinessHours(), getSettings(), getActiveStaff()]);
  const dayStartUtc = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const dayEndUtc = new Date(`${addDays(dateStr, 1)}T00:00:00Z`).toISOString();
  const existing = await getBookingsInRange(dayStartUtc, dayEndUtc);
  const staffCount = Math.max(1, activeStaff.length);

  const slots = computeAvailableSlots(
    dateStr,
    service.duration_min,
    hours,
    existing,
    settings.slot_granularity_min,
    staffCount
  );
  return { ok: true, slots };
}

const bookingSchema = z.object({
  serviceSlug: z.string().min(1),
  startsAtIso: z.string().datetime(),
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
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);

  const result = await createBooking({
    serviceId: service.id,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    customerEmail: parsed.data.customerEmail ?? null,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: endsAt.toISOString(),
    notes: parsed.data.notes ?? null,
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  // Send confirmation email — fire-and-forget, never blocks booking.
  if (parsed.data.customerEmail) {
    const s = await getSettings();
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
    });
    sendEmail({ to: parsed.data.customerEmail, subject, html, text }).catch(
      (err) => console.error("[email] Failed to send confirmation:", err)
    );
  }

  redirect(`/rezerwacja/sukces/${result.id}`);
}
