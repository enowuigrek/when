import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Clears legacy admin/demo cookies that point at demo tenants from the
 * cookie-based demo era. Called by the admin layout when it spots a
 * `when_admin` session whose tenant is `kind = "demo"`. Layouts (Server
 * Components) can't mutate cookies; route handlers can.
 */
export async function GET(req: NextRequest) {
  const jar = await cookies();
  jar.delete("when_admin");
  jar.delete("when_demo");
  return NextResponse.redirect(new URL("/admin/login", req.url));
}
