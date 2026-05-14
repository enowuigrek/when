import { redirect } from "next/navigation";
import { isAdminAuthenticated, getOriginalTenantId } from "@/lib/auth/admin-session";
import { isSessionSuperAdmin, listSwitchableTenants } from "@/lib/auth/super-admin";
import { logoutAction } from "./actions";
import { getSettings } from "@/lib/db/settings";
import { getAdminTenantId, getAdminTenantKind } from "@/lib/tenant";
import { TenantThemeWrapper } from "@/components/tenant-theme-wrapper";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { TenantSwitcher } from "@/components/tenant-switcher";

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
  const [s, tenantId, tenantKind, isSuperAdmin, originalTenantId] = await Promise.all([
    getSettings(),
    getAdminTenantId(),
    getAdminTenantKind(),
    isSessionSuperAdmin(),
    getOriginalTenantId(),
  ]);

  const switchableTenants = isSuperAdmin ? await listSwitchableTenants() : [];
  const isImpersonating = Boolean(originalTenantId) && originalTenantId !== tenantId;

  return (
    <TenantThemeWrapper settings={s}>
      <div className="flex min-h-screen bg-zinc-950">
        <AdminSidebar
          tenantId={tenantId}
          businessName={s.business_name}
          logoUrl={s.logo_url ?? undefined}
          logoutAction={logoutAction}
          isDemo={tenantKind === "demo"}
        />
        {/* pt-12 on mobile = height of the fixed top bar */}
        <div className="flex min-w-0 flex-1 flex-col pt-12 md:pt-0">
          {isImpersonating && (
            <ImpersonationBanner currentTenantName={s.business_name} />
          )}
          {isSuperAdmin && switchableTenants.length > 1 && (
            <div className="flex items-center justify-end gap-3 border-b border-zinc-800/60 bg-zinc-950/80 px-4 py-2 md:px-6">
              <TenantSwitcher
                tenants={switchableTenants}
                currentTenantId={tenantId}
              />
            </div>
          )}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </TenantThemeWrapper>
  );
}
