"use client";

import { usePathname } from "next/navigation";

/**
 * Client-side counterpart to `<AdminLink>`. Returns the URL prefix the admin
 * panel is currently mounted under: `/demo/{slug}` when the proxy rewrote the
 * request from a demo URL, `/admin` otherwise.
 *
 * Use it for `router.push()` and for any link whose component can't await
 * `headers()`. Build hrefs as `${adminBase}/klienci` — never `${adminBase}/admin/...`.
 */
export function useAdminBase(): string {
  const pathname = usePathname();
  const demoMatch = pathname.match(/^\/demo\/([^/]+)/);
  return demoMatch ? `/demo/${demoMatch[1]}` : "/admin";
}
