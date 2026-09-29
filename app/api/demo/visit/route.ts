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
 *
 * Two kinds of hit are dropped rather than recorded, because counting them
 * makes the number answer the wrong question. "Has the prospect opened it"
 * is worthless if it also counts us: a morning of testing against localhost
 * put fifteen views on a demo nobody outside had touched, and there is no
 * way to tell them apart afterwards — the row holds nothing but a path and
 * a time, deliberately. So the filtering has to happen before the insert.
 *
 * Dropped: anyone carrying an admin session (the owner, or us with the panel
 * open), and anything served from a dev host. Still nothing stored about
 * whoever is left.
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

  // Our own traffic, not a visitor's. 204 rather than an error: the beacon
  // has nothing to do differently, and a failed request in the console on
  // every page of a demo would be its own small mystery.
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const isDevHost = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  if (isDevHost || req.cookies.has("when_admin")) {
    return new NextResponse(null, { status: 204 });
  }

  const tenantId = await getDemoTenantIdBySlug(slug);
  if (!tenantId) return new NextResponse("Not found", { status: 404 });

  await createAdminClient().from("demo_visits").insert({ tenant_id: tenantId, path });
  return new NextResponse(null, { status: 204 });
}
