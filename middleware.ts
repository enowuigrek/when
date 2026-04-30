import { type NextRequest, NextResponse } from "next/server";

/**
 * Subdomain routing: *.whenbooking.pl → /widget/{subdomain}/...
 *
 * Examples:
 *   brzytwa.whenbooking.pl/          → /widget/brzytwa
 *   brzytwa.whenbooking.pl/masaz     → /widget/brzytwa/masaz
 *   brzytwa.whenbooking.pl/masaz?embed=1 → /widget/brzytwa/masaz?embed=1
 *
 * Not rewritten:
 *   www.whenbooking.pl, whenbooking.pl  (main marketing site)
 *   /admin/, /api/, /rezerwacja/        (internal routes)
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  // Strip port (e.g. "example.com:3001" → "example.com")
  const hostname = host.split(":")[0].toLowerCase();
  const pathname = req.nextUrl.pathname;

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
