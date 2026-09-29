import { getTenantIdBySlug, getDemoTenantBySlug } from "@/lib/tenant";
import { getSettingsForTenant } from "@/lib/db/for-tenant";
import { ThemeApplier } from "@/components/theme-applier";
import { DemoVisitBeacon } from "@/components/demo-visit-beacon";

/**
 * Apply the WIDGET tenant's theme (not the cookie-based tenant's theme).
 * The root layout sets data-theme on <html> based on the cookie tenant,
 * but the widget must show the correct embedded salon's colors/theme.
 */
export default async function WidgetTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) return <>{children}</>;

  const [settings, demo] = await Promise.all([
    getSettingsForTenant(tenantId),
    // Null for a paying client. The endpoint would refuse their hits anyway,
    // but asking it on every page view of a real salon's booking page is a
    // request that exists only to be turned down.
    getDemoTenantBySlug(tenantSlug),
  ]);
  const theme = settings.theme === "light" ? "light" : "dark";

  return (
    <div data-theme={theme}>
      <ThemeApplier theme={theme} />
      {children}
      {/* The email to a prospect carries two links — the panel and this page —
          and only the panel was counted, so a studio owner who went straight
          to the parent's view read as somebody who never opened anything.
          Demos and trials only: a paying salon's customers are not counted,
          and here they are not even asked about. */}
      {demo && <DemoVisitBeacon slug={tenantSlug} prefix="/zapisy" />}
    </div>
  );
}
