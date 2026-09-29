"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Tells the server that this demo page was opened.
 *
 * Fires on mount and on every client-side navigation, because the panel layout
 * does not re-render when you move between its pages — a server-side count
 * would only ever see the first load and would answer "did they open it" but
 * never "did they look around".
 *
 * Sends nothing but the slug and the path. The server drops the hit when it
 * comes from a signed-in admin or from a dev host, so our own clicking
 * around does not read back as the prospect's.
 */
export function DemoVisitBeacon({
  slug,
  prefix = "",
}: {
  slug: string;
  /**
   * Namespace for the recorded path, so the two surfaces stay apart.
   *
   * Once the slug prefix is stripped, the panel's home page and the
   * customer's are both "/" and would be one row saying nothing. The
   * customer-facing pages record under "/zapisy" — panel paths keep the
   * spelling they have always had, so rows written before this still read
   * the same way.
   */
  prefix?: string;
}) {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    // Strip whichever prefix carries the slug — /demo/{slug} for the panel,
    // /widget/{slug} for the page a parent sees. The slug is already sent,
    // and leaving it in would make every path unique to one tenant and
    // harder to read in a list. A subdomain has no prefix to strip.
    const stripped = pathname.replace(/^\/(?:demo|widget)\/[^/]+/, "");
    const path = `${prefix}${stripped}` || "/";

    fetch("/api/demo/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, path }),
      keepalive: true,
    }).catch(() => {
      // A missed count is not worth a broken page.
    });
  }, [pathname, slug, prefix]);

  return null;
}
