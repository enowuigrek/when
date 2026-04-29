import { getSettings } from "@/lib/db/settings";

/**
 * Wraps children in <div data-theme={...} style={accent vars}> based on
 * the cookie tenant's settings. Used by admin/(panel) and /rezerwacja
 * layouts so per-tenant theming applies WITHOUT polluting the root <html>
 * (which the marketing landing page expects to stay dark).
 */
export async function TenantThemeWrapper({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const theme = s.theme === "system" ? "dark" : s.theme;
  const accent = s.color_accent ?? "#d4a26a";
  return (
    <div
      data-theme={theme}
      className="flex min-h-screen flex-col"
      style={{
        "--accent": accent,
        "--accent-hover": accent,
        "--color-accent": accent,
        "--color-accent-hover": accent,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
