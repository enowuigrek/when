import { getMainSettings } from "@/lib/db/main-tenant";
import { TenantThemeWrapper } from "@/components/tenant-theme-wrapper";

/**
 * WHEN's own booking pages carry WHEN's theme. The confirmation page at
 * /rezerwacja/sukces/[id] is deliberately outside this group: it belongs to
 * the tenant whose booking it confirms and applies that tenant's theme itself.
 * Nested themes do not work — the dark overrides in globals.css come after the
 * light ones, so a light subtree inside this wrapper would still render dark.
 */
export default async function RezerwacjaLayout({ children }: { children: React.ReactNode }) {
  const s = await getMainSettings();
  return <TenantThemeWrapper settings={s}>{children}</TenantThemeWrapper>;
}
