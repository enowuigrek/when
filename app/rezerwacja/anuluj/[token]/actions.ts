"use server";

import { redirect } from "next/navigation";
import { verifyBookingToken } from "@/lib/booking-token";
import { getBookingById } from "@/lib/db/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/db/settings";
import { sendEmail } from "@/lib/email/send";
import { buildCancellationEmail } from "@/lib/email/booking-cancellation";

export async function customerCancelAction(formData: FormData) {
  const token = formData.get("token")?.toString() ?? "";
  const bookingId = verifyBookingToken(token, "cancel");
  if (!bookingId) throw new Error("Nieprawidłowy link.");

  const booking = await getBookingById(bookingId);
  if (!booking || booking.status !== "confirmed") {
    redirect("/rezerwacja/anuluj/blad");
  }

  if (new Date(booking.starts_at) <= new Date()) {
    redirect("/rezerwacja/anuluj/blad");
  }

  await createAdminClient()
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (booking.customer_email) {
    const s = await getSettings();
    const service = (booking as { service?: { name: string } }).service;
    const { subject, html, text } = buildCancellationEmail({
      bookingId,
      customerName: booking.customer_name,
      serviceName: service?.name ?? "—",
      startsAtIso: booking.starts_at,
      reason: "Anulowano przez klienta",
      business: {
        name: s.business_name,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
      },
    });
    sendEmail({ to: booking.customer_email, subject, html, text }).catch(() => {});
  }

  redirect(`/rezerwacja/anuluj/potwierdzone`);
}
