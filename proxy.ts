import { type NextRequest, NextResponse } from "next/server";

/**
 * Subdomain routing: *.whenbooking.pl → /widget/{subdomain}/...
 *
 * Demo routing: /demo/{slug}/... → /admin/... (internal rewrite)
 *   with an `x-demo-slug` header so the admin layout knows to skip the
 *   real-user auth gate and resolve tenant from the URL.
 *
 * Next.js 16 renamed the `middleware` file convention to `proxy`. The
 * exported function name follows the file name. Lives at the project root
 * (alongside `app/`).
 *
 * Examples:
 *   barbershop-tatarek.whenbooking.pl/         → /widget/barbershop-tatarek
 *   barbershop-tatarek.whenbooking.pl/strzyz   → /widget/barbershop-tatarek/strzyz
 *   /demo/demo-barber-cqrjjy/                  → /admin/  (+ x-demo-slug header)
 *   /demo/demo-barber-cqrjjy/harmonogram       → /admin/harmonogram
 *
 * Not rewritten:
 *   www.whenbooking.pl, whenbooking.pl  (main marketing site)
 *   /admin/, /api/, /rezerwacja/        (internal routes)
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  // Strip port (e.g. "example.com:3001" → "example.com")
  const hostname = host.split(":")[0].toLowerCase();
  const pathname = req.nextUrl.pathname;

  // ── Demo URLs: /demo/{slug}/* → /admin/* with x-demo-slug header ────────
  // The admin layout reads this header to render the demo tenant without
  // requiring a real admin session. Login is not exposed through demos.
  if (pathname.startsWith("/demo/")) {
    const match = pathname.match(/^\/demo\/([a-z0-9-]+)(\/.*)?$/i);
    if (match) {
      const [, demoSlug, rest] = match;
      const subpath = rest ?? "";
      // Demos never expose login or auth-related routes
      if (subpath === "/login" || subpath.startsWith("/login/")) {
        return NextResponse.redirect(new URL(`/demo/${demoSlug}`, req.url));
      }
      const url = req.nextUrl.clone();
      url.pathname = `/admin${subpath}`;
      const res = NextResponse.rewrite(url);
      res.headers.set("x-demo-slug", demoSlug);
      return res;
    }
  }

  // Auto-clear stale demo cookie when a real admin session is present.
  // Demo URL flow no longer sets `when_demo`, but legacy cookies may exist
  // from the previous cookie-based flow.
  if (pathname.startsWith("/admin")) {
    const hasSession = req.cookies.has("when_admin");
    const hasDemo = req.cookies.has("when_demo");
    if (hasSession && hasDemo) {
      const res = NextResponse.next();
      res.cookies.delete("when_demo");
      return res;
    }
  }

  // Detect tenant subdomain.
  // Production: *.whenbooking.pl  (3 parts)
  // Dev shortcut: *.localhost     (2 parts)
  const parts = hostname.split(".");
  let subdomain: string | null = null;

  if (
    parts.length === 3 &&
    parts[1] === "whenbooking" &&
    parts[2] === "pl" &&
    parts[0] !== "www"
  ) {
    subdomain = parts[0];
  } else if (
    parts.length === 2 &&
    parts[1] === "localhost" &&
    parts[0] !== "www"
  ) {
    // e.g. brzytwa.localhost — only for local dev via /etc/hosts hack
    subdomain = parts[0];
  }

  if (!subdomain) return NextResponse.next();

  // Never rewrite these paths — they're always global
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/rezerwacja") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/og")
  ) {
    return NextResponse.next();
  }

  // Already rewritten internally (shouldn't happen in normal flow)
  if (pathname.startsWith("/widget/")) return NextResponse.next();

  // Rewrite: /path → /widget/{subdomain}/path
  // / → /widget/{subdomain}  (no trailing slash)
  const newPathname =
    pathname === "/"
      ? `/widget/${subdomain}`
      : `/widget/${subdomain}${pathname}`;

  const url = req.nextUrl.clone();
  url.pathname = newPathname;

  const res = NextResponse.rewrite(url);
  // Let server components know they're on a subdomain (for link generation)
  res.headers.set("x-tenant-subdomain", subdomain);
  return res;
}

export const config = {
  matcher: [
    /*
     * Match everything except static assets. The regex skips:
     *   _next/static, _next/image, favicon.ico
     */
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
