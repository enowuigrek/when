import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoTenantIdBySlug } from "@/lib/tenant";

/**
 * Records that a demo page was opened.
 *
 * Anonymous by construction — the body carries a slug and a path, and nothing
 * about the visitor is read or stored. The slug is validated against the demo
 * tenants so this cannot be used to write rows for an arbitrary tenant, and
 * the path is truncated so a long URL cannot be used to stuff the table.
 */
export async function POST(req: NextRequest) {
  let body: { slug?: unknown; path?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : null;
  const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;
  if (!slug || !path) return new NextResponse("Bad request", { status: 400 });

  const tenantId = await getDemoTenantIdBySlug(slug);
  if (!tenantId) return new NextResponse("Not found", { status: 404 });

  await createAdminClient().from("demo_visits").insert({ tenant_id: tenantId, path });
  return new NextResponse(null, { status: 204 });
}
