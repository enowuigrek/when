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
 * Sends nothing but the slug and the path.
 */
export function DemoVisitBeacon({ slug }: { slug: string }) {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    // Strip the demo prefix: the slug is already sent, and keeping it would
    // make every path unique to one demo and harder to read in a list.
    const path = pathname.replace(/^\/demo\/[^/]+/, "") || "/";

    fetch("/api/demo/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, path }),
      keepalive: true,
    }).catch(() => {
      // A missed count is not worth a broken page.
    });
  }, [pathname, slug]);

  return null;
}
