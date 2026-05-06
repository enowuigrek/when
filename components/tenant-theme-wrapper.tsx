import { getSettings } from "@/lib/db/settings";

function accentFg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 0.45 ? "#09090b" : "#ffffff";
}

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
        "--color-accent-fg": accentFg(accent),
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
