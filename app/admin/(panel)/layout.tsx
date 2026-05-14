import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  isAdminAuthenticated,
  getOriginalTenantId,
  getSessionTenantId,
  destroyAdminSession,
} from "@/lib/auth/admin-session";
import { isSessionSuperAdmin, listSwitchableTenants } from "@/lib/auth/super-admin";
import { logoutAction } from "./actions";
import { getSettingsForTenant } from "@/lib/db/for-tenant";
import {
  getAdminTenantId,
  getAdminTenantKind,
  getDemoTenantIdBySlug,
} from "@/lib/tenant";
import { createAdminClient } from "@/lib/supabase/admin";
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
  // Demo URL flow: proxy rewrites /demo/{slug}/* → /admin/* and sets this
  // header. When present, render the demo panel without requiring a real
  // admin session and skip super-admin / impersonation features.
  const demoSlug = (await headers()).get("x-demo-slug");

  if (demoSlug) {
    const demoTenantId = await getDemoTenantIdBySlug(demoSlug);
    if (!demoTenantId) {
      // Demo expired or slug doesn't exist
      notFound();
    }
    const settings = await getSettingsForTenant(demoTenantId);
    return (
      <TenantThemeWrapper settings={settings}>
        <div className="flex min-h-screen bg-zinc-950">
          <AdminSidebar
            tenantId={demoTenantId}
            businessName={settings.business_name}
            logoUrl={settings.logo_url ?? undefined}
            logoutAction={logoutAction}
            isDemo
          />
          <div className="flex min-w-0 flex-1 flex-col pt-12 md:pt-0">
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </TenantThemeWrapper>
    );
  }

  // Real admin flow — require a non-demo session.
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  // Migration safety: if a legacy admin cookie still points at a demo
  // tenant (created during the cookie-based demo era), clear it and force
  // a fresh login at /admin/login. Demos now live at /demo/{slug}.
  const sessionTenantId = await getSessionTenantId();
  if (sessionTenantId) {
    const { data } = await createAdminClient()
      .from("tenants")
      .select("kind")
      .eq("id", sessionTenantId)
      .maybeSingle();
    if (data?.kind === "demo") {
      await destroyAdminSession();
      redirect("/admin/login");
    }
  }

  const [s, tenantId, tenantKind, isSuperAdmin, originalTenantId] = await Promise.all([
    getSettingsForTenant(sessionTenantId!),
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
