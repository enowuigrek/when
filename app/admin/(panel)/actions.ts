"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroyAdminSession } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { buildCancellationEmail } from "@/lib/email/booking-cancellation";
import { getSettings } from "@/lib/db/settings";
import { recordBookingEvent } from "@/lib/db/booking-events";
import { getAdminTenantId } from "@/lib/tenant";
import { getServiceById } from "@/lib/db/services";
import { createBooking, getBusyStaffIds } from "@/lib/db/bookings";
import { getActiveStaff } from "@/lib/db/staff";
import { resolveEffectivePricing } from "@/lib/db/staff-groups";
import { upsertCustomer } from "@/lib/db/customers";
import { requirePanelAccess } from "@/lib/auth/panel-access";

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function cancelBookingAction(formData: FormData) {
  await requirePanelAccess();

  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid booking id");

  const reason = formData.get("reason")?.toString().trim() || null;

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  // Fetch booking + service before updating (for the email).
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, service:services(name)")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", notes: reason ?? undefined })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) throw new Error(`Cancel failed: ${error.message}`);

  if (booking) {
    await recordBookingEvent({
      bookingId: id,
      eventType: "cancelled",
      source: "admin",
      customerName: booking.customer_name,
      serviceName: (booking.service as { name: string } | null)?.name ?? null,
      startsAtIso: booking.starts_at,
    });
  }

  // Send cancellation email if customer has one.
  if (booking?.customer_email) {
    const s = await getSettings();
    const { subject, html, text } = buildCancellationEmail({
      bookingId: id,
      customerName: booking.customer_name,
      serviceName: (booking.service as { name: string } | null)?.name ?? "—",
      startsAtIso: booking.starts_at,
      reason,
      business: { name: s.business_name, siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "" },
    });
    sendEmail({ to: booking.customer_email, subject, html, text }).catch(
      (err) => console.error("[email] Cancel notification failed:", err)
    );
  }

  revalidatePath("/admin/harmonogram");
}

export async function assignStaffAction(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePanelAccess();

  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Nieprawidłowe ID." };

  const staffId = formData.get("staffId")?.toString() || null;

  const tenantId = await getAdminTenantId();
  const { error } = await createAdminClient()
    .from("bookings")
    .update({ staff_id: staffId })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) {
    if (error.code === "23P01") return { ok: false, message: "Pracownik jest już zajęty w tym terminie." };
    return { ok: false, message: `Błąd: ${error.message}` };
  }

  revalidatePath("/admin/harmonogram");
  return { ok: true };
}

export async function editBookingNotesAction(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePanelAccess();

  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Nieprawidłowe ID." };

  const notes = formData.get("notes")?.toString().trim() || null;

  const tenantId = await getAdminTenantId();
  const { error } = await createAdminClient()
    .from("bookings")
    .update({ notes })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) return { ok: false, message: `Błąd: ${error.message}` };

  revalidatePath("/admin/harmonogram");
  return { ok: true };
}

export async function rescheduleBookingAction(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePanelAccess();

  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Nieprawidłowe ID." };

  const date = formData.get("date")?.toString(); // YYYY-MM-DD
  const time = formData.get("time")?.toString(); // HH:MM
  if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return { ok: false, message: "Nieprawidłowa data lub godzina." };
  }

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, service:services(name, duration_min)")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (!booking) return { ok: false, message: "Rezerwacja nie znaleziona." };
  const duration = (booking.service as { duration_min: number } | null)?.duration_min ?? 30;

  // Construct UTC ISO from Warsaw-local date+time. Compute Warsaw offset for that instant.
  const guess = new Date(`${date}T${time}:00Z`);
  const warsawHour = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).format(guess));
  const utcHour = guess.getUTCHours();
  const offsetH = (warsawHour - utcHour + 24) % 24;
  const startsAt = new Date(guess.getTime() - offsetH * 3600_000);
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);

  const { error } = await supabase
    .from("bookings")
    .update({ starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) {
    if (error.code === "23P01") return { ok: false, message: "Ten termin jest już zajęty." };
    return { ok: false, message: `Błąd: ${error.message}` };
  }

  await recordBookingEvent({
    bookingId: id,
    eventType: "rescheduled",
    source: "admin",
    customerName: booking.customer_name,
    serviceName: (booking.service as { name: string } | null)?.name ?? null,
    startsAtIso: startsAt.toISOString(),
  });

  revalidatePath("/admin/harmonogram");
  return { ok: true };
}

export async function markNoShowAction(formData: FormData) {
  await requirePanelAccess();

  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid booking id");

  const tenantId = await getAdminTenantId();
  const { error } = await createAdminClient()
    .from("bookings")
    .update({ status: "no_show" })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .eq("status", "confirmed");

  if (error) throw new Error(`No-show failed: ${error.message}`);

  revalidatePath("/admin/harmonogram");
}


/**
 * Warsaw wall-clock "YYYY-MM-DD" + "HH:MM" → the matching UTC instant.
 * Kept server-side on purpose: the admin may be on a phone set to another
 * timezone, so the browser's own offset cannot be trusted for this.
 */
function warsawWallClockToUtc(date: string, time: string): Date {
  const guess = new Date(`${date}T${time}:00Z`);
  const warsawHour = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).format(guess)
  );
  const offsetH = (warsawHour - guess.getUTCHours() + 24) % 24;
  return new Date(guess.getTime() - offsetH * 3600_000);
}

/**
 * Creates a booking straight from a slot clicked in the schedule.
 *
 * The full /rezerwacja/nowa flow still exists for the "+" button, where there
 * is no context; here the staff member and the time come from the cell that
 * was clicked, so only the service and the customer are actually missing.
 */
export async function createBookingAtSlotAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePanelAccess();

  const serviceId = formData.get("serviceId")?.toString() ?? "";
  const date = formData.get("date")?.toString() ?? "";
  const time = formData.get("time")?.toString() ?? "";
  const staffId = formData.get("staffId")?.toString() || null;
  const customerName = formData.get("customerName")?.toString().trim() ?? "";
  const customerPhone = formData.get("customerPhone")?.toString().trim() ?? "";
  const customerEmail = formData.get("customerEmail")?.toString().trim() || null;
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!/^[0-9a-f-]{36}$/i.test(serviceId)) return { ok: false, message: "Wybierz usługę." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return { ok: false, message: "Nieprawidłowa data lub godzina." };
  }
  if (customerName.length < 2) return { ok: false, message: "Podaj imię i nazwisko." };
  if (customerPhone.length < 7) return { ok: false, message: "Podaj numer telefonu." };

  const service = await getServiceById(serviceId);
  if (!service) return { ok: false, message: "Usługa nie istnieje." };

  const startsAt = warsawWallClockToUtc(date, time);

  // No column clicked (single "Rezerwacje" column) — fall back to whoever is free.
  let resolvedStaffId = staffId;
  if (!resolvedStaffId) {
    const fallbackEnd = new Date(startsAt.getTime() + service.duration_min * 60_000);
    const [busyIds, staff] = await Promise.all([
      getBusyStaffIds(startsAt.toISOString(), fallbackEnd.toISOString()),
      getActiveStaff(),
    ]);
    resolvedStaffId = staff.find((s) => !busyIds.includes(s.id))?.id ?? null;
  }

  const pricing = await resolveEffectivePricing(service.id, resolvedStaffId);
  const durationMin = pricing?.duration_min ?? service.duration_min;
  const pricePln = pricing?.price_pln ?? service.price_pln;

  const result = await createBooking({
    serviceId: service.id,
    customerName,
    customerPhone,
    customerEmail,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: new Date(startsAt.getTime() + durationMin * 60_000).toISOString(),
    notes,
    staffId: resolvedStaffId,
    pricePlnSnapshot: pricePln,
    durationMinSnapshot: durationMin,
  });

  if (!result.ok) {
    if (result.error === "slot_taken") {
      return { ok: false, message: "Ten termin koliduje z inną rezerwacją." };
    }
    return { ok: false, message: result.message };
  }

  await recordBookingEvent({
    bookingId: result.id,
    eventType: "created",
    source: "admin",
    customerName,
    serviceName: service.name,
    startsAtIso: startsAt.toISOString(),
  });

  // Keeping the customer book in sync is a nicety; a failure here must not
  // undo a booking that already exists.
  try {
    await upsertCustomer({ phone: customerPhone, name: customerName, email: customerEmail });
  } catch { /* ignore */ }

  revalidatePath("/admin/harmonogram");
  return { ok: true };
}
