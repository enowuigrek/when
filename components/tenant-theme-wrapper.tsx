import type { Settings } from "@/lib/db/settings";
import { accentFg, lighten } from "@/lib/color-utils";
import { ThemeApplier } from "./theme-applier";

/**
 * Applies tenant theme (accent color, dark/light) via CSS variables.
 * Caller is responsible for fetching `settings` with the correct tenant
 * resolution — admin pages should pass admin-session settings, public
 * pages must pass settings for an explicit tenantId (e.g. via
 * `getMainSettings()` or `getSettingsForTenant(id)`). This separation
 * prevents an admin session from leaking onto public pages.
 */
export function TenantThemeWrapper({
  settings,
  children,
}: {
  settings: Settings;
  children: React.ReactNode;
}) {
  const theme = settings.theme === "system" ? "dark" : settings.theme;
  const accent = settings.color_accent ?? "#d4a26a";
  const accentHover = lighten(accent, 28);

  return (
    <div
      data-theme={theme}
      // dvh, not vh: Safari resolves 100vh against the viewport as if the
      // toolbar were hidden, so the wrapper ends up taller than what is
      // actually visible and the page scrolls by exactly that difference.
      className="flex min-h-dvh flex-col"
      style={{
        // Painted here, server-side, rather than inherited from <body>: the
        // root only learns the theme once ThemeApplier runs after hydration,
        // so on a hard load the dark body showed through first. This wrapper
        // covers the viewport, so nothing flashes.
        backgroundColor: theme === "light" ? "#f4f4f5" : "#09090b",
        "--accent": accent,
        "--accent-hover": accentHover,
        "--color-accent": accent,
        "--color-accent-hover": accentHover,
        "--color-accent-fg": accentFg(accent),
      } as React.CSSProperties}
    >
      <ThemeApplier
        theme={theme as "light" | "dark"}
        accent={accent}
        accentHover={accentHover}
        accentFg={accentFg(accent)}
      />
      {children}
    </div>
  );
}
