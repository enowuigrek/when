import { TenantThemeWrapper } from "@/components/tenant-theme-wrapper";

export default function RezerwacjaLayout({ children }: { children: React.ReactNode }) {
  return <TenantThemeWrapper>{children}</TenantThemeWrapper>;
}
