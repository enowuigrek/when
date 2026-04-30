import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

/**
 * One-time setup route that creates Łukasz's personal booking tenant.
 * Call once: GET /api/setup/when-booking?secret=SETUP_SECRET&password=YOUR_PASSWORD
 *
 * Safe to call multiple times — uses upsert / insert-if-not-exists.
 */

// Fixed UUID so it's stable and predictable
const TENANT_ID = "00000000-0000-0000-0000-000000000002";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const setupSecret = process.env.SETUP_SECRET;

  if (!setupSecret) return NextResponse.json({ error: "SETUP_SECRET env var not set" }, { status: 500 });
  if (secret !== setupSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const password = req.nextUrl.searchParams.get("password");
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "?password= required (min 8 chars)" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const passwordHash = await hashPassword(password);

  // ── 1. Tenant ─────────────────────────────────────────────────────────────
  const { error: tenantErr } = await supabase.from("tenants").upsert(
    {
      id: TENANT_ID,
      slug: "when",
      name: "when? — Łukasz Nowak",
      kind: "real",
      email: "kontakt@lukasznowak.dev",
      password_hash: passwordHash,
      expires_at: null,
    },
    { onConflict: "id" }
  );
  if (tenantErr) return NextResponse.json({ step: "tenant", error: tenantErr.message }, { status: 500 });

  // ── 2. Settings ───────────────────────────────────────────────────────────
  const { data: existingSettings } = await supabase
    .from("settings")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .maybeSingle();

  if (!existingSettings) {
    await supabase.from("settings").insert({
      tenant_id: TENANT_ID,
      business_name: "when?",
      tagline: "Bezpłatna rozmowa o systemie rezerwacji",
      phone: "509266079",
      email: "kontakt@lukasznowak.dev",
      slot_granularity_min: 30,
      booking_horizon_days: 30,
      color_accent: "#22c55e", // zielony — jak akcent Twojego panelu
    });
  } else {
    // Update password hash only (settings might be customised already)
    await supabase.from("tenants")
      .update({ password_hash: passwordHash })
      .eq("id", TENANT_ID);
  }

  // ── 3. Business hours — Mon (1) + Wed (3) 10:00–15:00, rest closed ────────
  const { data: existingHours } = await supabase
    .from("business_hours")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .limit(1);

  if (!existingHours || existingHours.length === 0) {
    const hours = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
      tenant_id: TENANT_ID,
      day_of_week: dow,
      open_time: (dow === 1 || dow === 3) ? "10:00" : null,
      close_time: (dow === 1 || dow === 3) ? "15:00" : null,
      closed: dow !== 1 && dow !== 3,
    }));
    await supabase.from("business_hours").insert(hours);
  }

  // ── 4. Service ─────────────────────────────────────────────────────────────
  const { data: existingService } = await supabase
    .from("services")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .eq("slug", "demo-30-min")
    .maybeSingle();

  if (!existingService) {
    await supabase.from("services").insert({
      tenant_id: TENANT_ID,
      slug: "demo-30-min",
      name: "Bezpłatna rozmowa o when? — Demo 30 min",
      description:
        "Poznaj system rezerwacji when? na żywo. Pokażę Ci panel managera, omówimy Twoje potrzeby i sprawdzimy czy when? pasuje do Twojego biznesu. " +
        "Po potwierdzeniu wyślę link Google Meet na podany adres email.",
      duration_min: 30,
      price_pln: 0,
      active: true,
      sort_order: 1,
      payment_mode: "none",
    });
  }

  return NextResponse.json({
    ok: true,
    tenantId: TENANT_ID,
    message: "Tenant created/updated successfully",
    next: [
      "1. Log in at /admin/login with email: kontakt@lukasznowak.dev",
      "2. Widget URL: /widget/when/demo-30-min",
      "3. You can now manage hours, time-off and settings from the panel",
    ],
  });
}
