"use client";

import { useLayoutEffect } from "react";

/**
 * Sets data-theme on <html> before first paint so CSS overrides
 * cascade from the root, not just from a nested div wrapper.
 * This prevents the flash of wrong theme on page load.
 */
export function ThemeApplier({ theme }: { theme: "light" | "dark" }) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return null;
}
