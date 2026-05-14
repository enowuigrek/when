import { getMainSettings } from "@/lib/db/main-tenant";
import { TenantThemeWrapper } from "@/components/tenant-theme-wrapper";

export default async function RezerwacjaLayout({ children }: { children: React.ReactNode }) {
  const s = await getMainSettings();
  return <TenantThemeWrapper settings={s}>{children}</TenantThemeWrapper>;
}
