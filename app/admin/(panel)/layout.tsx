import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { logoutAction } from "./actions";
import { getSettings } from "@/lib/db/settings";
import { getAdminTenantId } from "@/lib/tenant";
import { TenantThemeWrapper } from "@/components/tenant-theme-wrapper";
import { AdminSidebar } from "@/components/admin-sidebar";

// Always re-fetch settings (theme, accent, business_name) on every render
// so changes from the Settings form are reflected immediately.
export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  const [s, tenantId] = await Promise.all([getSettings(), getAdminTenantId()]);

  return (
    <TenantThemeWrapper>
      <div className="flex min-h-screen bg-zinc-950">
        <AdminSidebar
          tenantId={tenantId}
          businessName={s.business_name}
          logoutAction={logoutAction}
        />
        {/* pt-12 on mobile = height of the fixed top bar */}
        <div className="flex min-w-0 flex-1 flex-col pt-12 md:pt-0">
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </TenantThemeWrapper>
  );
}
