import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setDemoCookie } from "@/lib/tenant";
import { createAdminSession } from "@/lib/auth/admin-session";
import { seedDemoTenant, type DemoVariant } from "@/lib/demo/seed";

const DEMO_TTL_HOURS = 24;

export async function GET(req: NextRequest) {
  const variantRaw = req.nextUrl.searchParams.get("wariant") ?? "barber";
  const variant: DemoVariant =
    variantRaw === "kosmetyka" ? "kosmetyka"
    : variantRaw === "joga" ? "joga"
    : "barber";

  const supabase = createAdminClient();
  const expiresAt = new Date(Date.now() + DEMO_TTL_HOURS * 3600 * 1000).toISOString();
  const slug = `demo-${variant}-${Math.random().toString(36).slice(2, 8)}`;
  const name = variant === "kosmetyka" ? "Demo — Gabinet kosmetyczny"
    : variant === "joga" ? "Demo — Studio Jogi"
    : "Demo — Barber Shop";

  const { data: tenant, error } = await supabase
    .from("tenants")
    .insert({ slug, name, kind: "demo", variant, expires_at: expiresAt })
    .select("id")
    .single();

  if (error || !tenant) {
    return NextResponse.json({ error: error?.message ?? "Failed to create tenant" }, { status: 500 });
  }

  await seedDemoTenant(tenant.id as string, variant);
  await setDemoCookie(tenant.id as string);
  await createAdminSession(tenant.id as string);

  return NextResponse.redirect(new URL("/admin", req.url));
}
