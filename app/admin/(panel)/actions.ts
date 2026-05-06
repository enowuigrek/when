"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroyAdminSession, isAdminAuthenticated } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";
import { sendEmail } from "@/lib/email/send";
import { buildCancellationEmail } from "@/lib/email/booking-cancellation";
import { buildConfirmationEmail } from "@/lib/email/booking-confirmation";
import { getSettings } from "@/lib/db/settings";
import { signBookingToken } from "@/lib/booking-token";
import { recordBookingEvent } from "@/lib/db/booking-events";
import { notifyStaff } from "@/lib/email/notify-staff";

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function cancelBookingAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

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
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Nieprawidłowe ID." };

  const newStaffId = formData.get("staffId")?.toString() || null;

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  // Fetch booking before update to know old staff + booking details
  const { data: booking } = await supabase
    .from("bookings")
    .select("staff_id, customer_name, customer_phone, starts_at, ends_at, service:services(name)")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  const oldStaffId = booking?.staff_id as string | null ?? null;

  const { error } = await supabase
    .from("bookings")
    .update({ staff_id: newStaffId })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) {
    if (error.code === "23P01") return { ok: false, message: "Pracownik jest już zajęty w tym terminie." };
    return { ok: false, message: `Błąd: ${error.message}` };
  }

  // Send staff notifications (fire-and-forget)
  if (booking) {
    const customerName = booking.customer_name as string;
    const customerPhone = booking.customer_phone as string;
    const serviceName = (booking.service as unknown as { name: string } | null)?.name ?? "—";
    const startsAtIso = booking.starts_at as string;
    const endsAtIso = booking.ends_at as string;

    // Notify new staff if assigned
    if (newStaffId) {
      notifyStaff({
        staffId: newStaffId,
        type: oldStaffId ? "reassigned_to" : "assigned",
        customerName,
        customerPhone,
        serviceName,
        startsAtIso,
        endsAtIso,
        previousStaffName: null, // we'd need an extra lookup — skip for now
      }).catch(() => {});
    }

    // Notify old staff if removed
    if (oldStaffId && oldStaffId !== newStaffId) {
      notifyStaff({
        staffId: oldStaffId,
        type: "unassigned",
        customerName,
        customerPhone,
        serviceName,
        startsAtIso,
        endsAtIso,
        newStaffName: null, // could fetch but keep simple
      }).catch(() => {});
    }
  }

  revalidatePath("/admin/harmonogram");
  return { ok: true };
}

export async function editBookingNotesAction(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

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

export async function changeBookingServiceAction(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const id = formData.get("id")?.toString();
  const newServiceId = formData.get("serviceId")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Nieprawidłowe ID rezerwacji." };
  if (!newServiceId || !/^[0-9a-f-]{36}$/i.test(newServiceId)) return { ok: false, message: "Wybierz usługę." };

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const [bookingRes, serviceRes] = await Promise.all([
    supabase.from("bookings").select("starts_at, staff_id").eq("tenant_id", tenantId).eq("id", id).maybeSingle(),
    supabase.from("services").select("id, name, duration_min, price_pln").eq("tenant_id", tenantId).eq("id", newServiceId).maybeSingle(),
  ]);

  if (!bookingRes.data) return { ok: false, message: "Rezerwacja nie znaleziona." };
  if (!serviceRes.data) return { ok: false, message: "Usługa nie znaleziona." };

  const startsAt = new Date(bookingRes.data.starts_at as string);
  const staffId = bookingRes.data.staff_id as string | null;

  const { resolveEffectivePricing } = await import("@/lib/db/staff-groups");
  const pricing = await resolveEffectivePricing(newServiceId, staffId);
  const duration = pricing?.duration_min ?? (serviceRes.data.duration_min as number);
  const price = pricing?.price_pln ?? (serviceRes.data.price_pln as number);
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);

  const { error } = await supabase
    .from("bookings")
    .update({
      service_id: newServiceId,
      ends_at: endsAt.toISOString(),
      price_pln_snapshot: price,
      duration_min_snapshot: duration,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) {
    if (error.code === "23P01") {
      return { ok: false, message: `Nowa usługa (${duration} min) nie zmieści się — termin koliduje z inną rezerwacją.` };
    }
    return { ok: false, message: `Błąd: ${error.message}` };
  }

  revalidatePath("/admin/harmonogram");
  return { ok: true };
}

export async function rescheduleBookingAction(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Nieprawidłowe ID." };

  const startsAtIso = formData.get("startsAtIso")?.toString();
  if (!startsAtIso || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(startsAtIso)) {
    return { ok: false, message: "Nieprawidłowy termin." };
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
  const duration = (booking.duration_min_snapshot as number | null) ?? (booking.service as { duration_min: number } | null)?.duration_min ?? 30;

  const startsAt = new Date(startsAtIso);
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

  // Notify staff member about the rescheduled time (fire-and-forget)
  if (booking.staff_id) {
    notifyStaff({
      staffId: booking.staff_id as string,
      type: "rescheduled",
      customerName: booking.customer_name as string,
      customerPhone: booking.customer_phone as string,
      serviceName: (booking.service as { name: string } | null)?.name ?? "—",
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
    }).catch(() => {});
  }

  // Send reschedule confirmation email to customer
  if (booking.customer_email) {
    const s = await getSettings();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const cancelToken = signBookingToken(id, "cancel");
    const rescheduleToken = signBookingToken(id, "reschedule");
    const { subject, html, text } = buildConfirmationEmail({
      bookingId: id,
      customerName: booking.customer_name as string,
      serviceName: (booking.service as { name: string } | null)?.name ?? "—",
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      pricePln: (booking.price_pln_snapshot as number) ?? 0,
      notes: (booking.notes as string | null) ?? null,
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
    sendEmail({ to: booking.customer_email as string, subject, html, text }).catch(
      (err) => console.error("[email] Reschedule notification failed:", err)
    );
  }

  revalidatePath("/admin/harmonogram");
  return { ok: true };
}

export async function markNoShowAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

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
