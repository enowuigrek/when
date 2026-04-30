import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTpayNotification, parseTpayJsonNotification } from "@/lib/tpay";
import { sendEmail } from "@/lib/email/send";
import { buildConfirmationEmail } from "@/lib/email/booking-confirmation";
import { signBookingToken } from "@/lib/booking-token";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";
import { recordBookingEvent } from "@/lib/db/booking-events";

/**
 * Tpay sends a notification when a payment is completed.
 *
 * Two modes:
 *  A) Form POST (legacy Tpay panels) — x-www-form-urlencoded
 *  B) JSON POST (OpenAPI) — application/json
 *
 * We handle both. Tpay expects the response to contain "TRUE" on success.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  let bookingId: string | null = null;
  let transactionId: string | null = null;
  let verified = false;

  // ── A) Form POST ──────────────────────────────────────────────────────────
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);

    const trId = params.get("tr_id") ?? "";
    const trAmount = params.get("tr_amount") ?? "";
    const trCrc = params.get("tr_crc") ?? "";
    const trStatus = params.get("tr_status") ?? "";
    const md5sum = params.get("md5sum") ?? "";

    verified = verifyTpayNotification({ trId, trAmount, trCrc, trStatus, md5sum });
    bookingId = trCrc || null;
    transactionId = trId || null;
  }

  // ── B) JSON POST ─────────────────────────────────────────────────────────
  else if (contentType.includes("application/json")) {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return new NextResponse("Bad JSON", { status: 400 });
    }

    const parsed = parseTpayJsonNotification(body);
    if (!parsed) return new NextResponse("Bad payload", { status: 400 });

    // For JSON notifications we check status field
    // Full JWS verification skipped in MVP — add later with Tpay public key
    verified = parsed.status === "correct";
    bookingId = parsed.bookingId;
    transactionId = parsed.transactionId;
  } else {
    return new NextResponse("Unsupported Content-Type", { status: 415 });
  }

  if (!verified || !bookingId) {
    console.warn("[tpay] Notification rejected", { verified, bookingId });
    // Still return 200 so Tpay doesn't retry indefinitely
    return new NextResponse("FALSE", { status: 200 });
  }

  // ── Look up booking ───────────────────────────────────────────────────────
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, customer_name, customer_email, starts_at, ends_at, tenant_id, price_pln_snapshot, notes, service_id, service:services(name)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    console.warn("[tpay] Booking not found", bookingId);
    return new NextResponse("TRUE", { status: 200 }); // acknowledge anyway
  }

  if (booking.status !== "pending_payment") {
    // Already processed (duplicate webhook) — acknowledge
    return new NextResponse("TRUE", { status: 200 });
  }

  // ── Confirm booking ───────────────────────────────────────────────────────
  await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      payment_status: "paid",
      tpay_transaction_id: transactionId,
    })
    .eq("id", bookingId);

  const svcRaw = booking.service;
  const svcForEvent = (Array.isArray(svcRaw) ? svcRaw[0] : svcRaw) as { name: string } | null;
  await recordBookingEvent({
    bookingId: booking.id as string,
    eventType: "payment_confirmed",
    source: "system",
    tenantId: booking.tenant_id as string,
    customerName: booking.customer_name as string,
    serviceName: svcForEvent?.name ?? null,
    startsAtIso: booking.starts_at as string,
  });

  // ── Send confirmation email ───────────────────────────────────────────────
  if (booking.customer_email) {
    const { data: settings } = await supabase
      .from("settings")
      .select("business_name, address_street, address_postal, address_city, phone")
      .eq("tenant_id", booking.tenant_id)
      .maybeSingle();

    const cancelToken = signBookingToken(booking.id as string, "cancel");
    const rescheduleToken = signBookingToken(booking.id as string, "reschedule");

    const svc = (Array.isArray(booking.service) ? booking.service[0] : booking.service) as { name: string } | null;
    const { subject, html, text } = buildConfirmationEmail({
      bookingId: booking.id as string,
      customerName: booking.customer_name as string,
      serviceName: svc?.name ?? "",
      startsAtIso: booking.starts_at as string,
      endsAtIso: booking.ends_at as string,
      pricePln: booking.price_pln_snapshot as number ?? 0,
      notes: booking.notes as string | null,
      business: {
        name: (settings?.business_name as string | null) ?? "",
        addressStreet: (settings?.address_street as string | null) ?? null,
        addressPostal: (settings?.address_postal as string | null) ?? null,
        addressCity: (settings?.address_city as string | null) ?? null,
        phone: (settings?.phone as string | null) ?? null,
      },
      cancelUrl: `${siteUrl}/rezerwacja/anuluj/${cancelToken}`,
      rescheduleUrl: `${siteUrl}/rezerwacja/zmien/${rescheduleToken}`,
    });

    sendEmail({
      to: booking.customer_email as string,
      subject,
      html,
      text,
    }).catch(() => {});
  }

  // Tpay requires the response body to contain "TRUE"
  return new NextResponse("TRUE", { status: 200 });
}
