import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionTenantId } from "@/lib/auth/admin-session";
import { getDemoTenantId, getAdminTenantId, getAdminTenantSlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const adminCookieRaw = jar.get("when_admin")?.value ?? null;
  const demoCookieRaw = jar.get("when_demo")?.value ?? null;

  const [sessionTenantId, demoTenantId, adminTenantId, adminSlug] = await Promise.all([
    getSessionTenantId(),
    getDemoTenantId(),
    getAdminTenantId(),
    getAdminTenantSlug(),
  ]);

  return NextResponse.json({
    cookies: {
      when_admin: adminCookieRaw ? `${adminCookieRaw.slice(0, 20)}…` : null,
      when_demo: demoCookieRaw,
    },
    resolved: {
      sessionTenantId,
      demoTenantId,
      adminTenantId,
      adminSlug,
    },
  });
}
