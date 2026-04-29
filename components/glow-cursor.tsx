"use client";

import { useEffect } from "react";

/**
 * Updates `--glow-x` / `--glow-y` CSS variables on `.glow-card`
 * elements based on cursor position. Pairs with the `.glow-card::before`
 * radial gradient defined in globals.css.
 */
export function GlowCursor() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function handleMove(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(".glow-card");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      target.style.setProperty("--glow-x", `${x.toFixed(1)}%`);
      target.style.setProperty("--glow-y", `${y.toFixed(1)}%`);
    }

    document.addEventListener("mousemove", handleMove, { passive: true });
    return () => document.removeEventListener("mousemove", handleMove);
  }, []);

  return null;
}
