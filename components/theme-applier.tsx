"use client";

import { useLayoutEffect } from "react";

/**
 * Puts the tenant's theme on <html>, where everything can reach it.
 *
 * `data-theme` has to be here so the CSS overrides cascade from the root
 * rather than from a nested div, which is what stopped the flash of the wrong
 * theme on load.
 *
 * The accent has the same problem for a different reason. It is painted on the
 * wrapper div server-side, so the first paint is already in the tenant's
 * colour — but anything rendered through a portal lands on <body>, outside
 * that wrapper, and fell back to WHEN's own default. The notification panel
 * and its toasts are portals, so a tenant with a purple accent got an orange
 * unread marker and an orange "Nowa rezerwacja". Copying the variables to the
 * root fixes every portal at once, and cannot flash: a portal only exists
 * after hydration, which is after this runs.
 */
export function ThemeApplier({
  theme,
  accent,
  accentHover,
  accentFg,
}: {
  theme: "light" | "dark";
  accent?: string;
  accentHover?: string;
  accentFg?: string;
}) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const vars: [string, string | undefined][] = [
      ["--accent", accent],
      ["--accent-hover", accentHover],
      ["--color-accent", accent],
      ["--color-accent-hover", accentHover],
      ["--color-accent-fg", accentFg],
    ];
    for (const [name, value] of vars) {
      if (value) root.style.setProperty(name, value);
    }
    return () => {
      // Left behind, the previous tenant's colour would tint the next panel
      // rendered on this document — impersonation and the tenant switcher both
      // swap tenants without a reload.
      for (const [name] of vars) root.style.removeProperty(name);
    };
  }, [accent, accentHover, accentFg]);

  return null;
}
