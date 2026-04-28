import { getTenantIdBySlug } from "@/lib/tenant";
import { getSettingsForTenant } from "@/lib/db/for-tenant";

/**
 * Apply the WIDGET tenant's theme (not the cookie-based tenant's theme).
 * The root layout sets data-theme on <html> based on the cookie tenant,
 * but the widget must show the correct embedded salon's colors/theme.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function WidgetTenantLayout({ children, params }: any) {
  const { tenantSlug } = await params as { tenantSlug: string };
  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) return <>{children}</>;

  const settings = await getSettingsForTenant(tenantId);
  const theme = settings.theme === "light" ? "light" : "dark";

  return (
    <div data-theme={theme}>
      {children}
    </div>
  );
}
