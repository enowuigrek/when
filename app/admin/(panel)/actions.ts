"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroyAdminSession, isAdminAuthenticated } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { buildCancellationEmail } from "@/lib/email/booking-cancellation";
import { getSettings } from "@/lib/db/settings";

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function cancelBookingAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid booking id");

  const reason = formData.get("reason")?.toString().trim() || null;

  const supabase = createAdminClient();

  // Fetch booking + service before updating (for the email).
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, service:services(name)")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", notes: reason ?? undefined })
    .eq("id", id);

  if (error) throw new Error(`Cancel failed: ${error.message}`);

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

  revalidatePath("/admin");
  revalidatePath("/admin/tydzien");
}

export async function assignStaffAction(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Nieprawidłowe ID." };

  const staffId = formData.get("staffId")?.toString() || null;

  const { error } = await createAdminClient()
    .from("bookings")
    .update({ staff_id: staffId })
    .eq("id", id);

  if (error) {
    if (error.code === "23P01") return { ok: false, message: "Pracownik jest już zajęty w tym terminie." };
    return { ok: false, message: `Błąd: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tydzien");
  return { ok: true };
}
