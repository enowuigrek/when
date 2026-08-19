"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";

/**
 * Feedback for a link that has been clicked but has not arrived yet.
 *
 * Both of these must be rendered *inside* the `<Link>` they report on —
 * `useLinkStatus` reads the nearest Link above it, so they cannot be lifted
 * into the parent that renders the link.
 *
 * Navigation in this panel is server-rendered, so between the tap and the new
 * screen there is a gap with nothing in it. On a fast connection it is
 * invisible; on a phone on mobile data it is long enough to make someone tap
 * twice, wondering whether the first one registered.
 */

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent opacity-70 ${className}`}
    />
  );
}

/** A spinner beside a label, appearing only while the link is pending. */
export function LinkSpinner({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className={className} /> : null;
}

/**
 * Swaps an icon for a spinner in place, so nothing around it shifts.
 * For icon-only buttons, where a spinner appearing alongside would widen them.
 */
export function LinkPendingSwap({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner /> : <>{children}</>;
}

/**
 * A wash over a whole control — for the staff chips, where a spinner would
 * shift the row as it appeared and every chip would jump.
 */
export function LinkPendingWash() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 animate-pulse rounded-lg bg-zinc-500/20"
    />
  );
}
