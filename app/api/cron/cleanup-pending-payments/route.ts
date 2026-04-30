import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Cancels bookings stuck in `pending_payment` for more than 20 minutes.
 * Tpay gives the customer ~15 min to complete payment, so 20 min is safe.
 * Scheduled: every 5 minutes via vercel.json cron.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 20 minutes ago
  const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("status", "pending_payment")
    .lt("created_at", cutoff)
    .select("id, tenant_id, customer_name, tpay_transaction_id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cancelled = data ?? [];
  if (cancelled.length > 0) {
    console.log(`[cleanup-pending-payments] Cancelled ${cancelled.length} stale bookings:`, cancelled.map((b) => b.id));
  }

  return NextResponse.json({
    ok: true,
    cancelledCount: cancelled.length,
    cancelled: cancelled.map((b) => ({ id: b.id, customerName: b.customer_name })),
  });
}
