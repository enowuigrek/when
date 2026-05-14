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
      className="flex min-h-screen flex-col"
      style={{
        "--accent": accent,
        "--accent-hover": accentHover,
        "--color-accent": accent,
        "--color-accent-hover": accentHover,
        "--color-accent-fg": accentFg(accent),
      } as React.CSSProperties}
    >
      <ThemeApplier theme={theme as "light" | "dark"} />
      {children}
    </div>
  );
}
