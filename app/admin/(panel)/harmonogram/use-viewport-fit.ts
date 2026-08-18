"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Room left below the grid: the section's own bottom padding (py-8 = 32px)
 * plus a little slack. Too small and the page gains a few pixels of scroll of
 * its own, which is exactly the ambiguity this is meant to remove.
 */
const BOTTOM_GAP = 40;

/**
 * Height that makes an element end exactly at the bottom of the window.
 *
 * A fixed `calc(100vh - Xrem)` left the page ~77px too tall, so the document
 * scrolled as well as the grid — and which one moved depended on where the
 * pointer happened to be. Measuring the element's own offset removes the
 * guess: whatever sits above it, the grid finishes at the fold and the page
 * itself has nothing left to scroll.
 *
 * Returns undefined below `lg`, where the page scroll is the right one to
 * keep and nesting a second scroll area would fight the thumb.
 */
export function useViewportFit(ref: RefObject<HTMLElement | null>): number | undefined {
  const [maxH, setMaxH] = useState<number | undefined>(undefined);

  useEffect(() => {
    function calc() {
      const el = ref.current;
      if (!el || window.innerWidth < 1024) {
        setMaxH(undefined);
        return;
      }
      // Document-relative, so a scrolled page does not skew the result.
      const top = el.getBoundingClientRect().top + window.scrollY;
      setMaxH(Math.max(320, Math.round(window.innerHeight - top - BOTTOM_GAP)));
    }

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [ref]);

  return maxH;
}
