import { type NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { getRecentBookingEventsForTenant } from "@/lib/db/booking-events";
import { getDemoTenantIdBySlug, getAdminTenantId } from "@/lib/tenant";

/**
 * Feeds the admin notification bell.
 *
 * Two access paths, because the bell polls from the browser and that request
 * does NOT go through the `/demo/{slug}` rewrite — the proxy only sets
 * `x-demo-slug` on paths under /demo, so it is absent here:
 *
 *   ?demo={slug} — demo/trial panel. The slug is the credential (whoever has
 *                  the link has the panel), validated against the DB before
 *                  use. The tenant MUST come from that lookup: relying on
 *                  getAdminTenantId() here would fall through to
 *                  MAIN_TENANT_ID and serve the real tenant's events.
 *   no param     — real admin, scoped by session.
 */
export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  const demoSlug = req.nextUrl.searchParams.get("demo");

  if (demoSlug) {
    const tenantId = await getDemoTenantIdBySlug(demoSlug);
    if (!tenantId) return new NextResponse("Not found", { status: 404 });
    const events = await getRecentBookingEventsForTenant(tenantId, 30, 48, since);
    return NextResponse.json({ events });
  }

  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const events = await getRecentBookingEventsForTenant(await getAdminTenantId(), 30, 48, since);
  return NextResponse.json({ events });
}
