import { getSettings } from "@/lib/db/settings";
import { ThemeApplier } from "./theme-applier";

function accentFg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 0.45 ? "#09090b" : "#ffffff";
}

/** Lighten a hex color by mixing it toward white by `amount` (0–255). */
function lighten(hex: string, amount: number): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export async function TenantThemeWrapper({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const theme = s.theme === "system" ? "dark" : s.theme;
  const accent = s.color_accent ?? "#d4a26a";
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
