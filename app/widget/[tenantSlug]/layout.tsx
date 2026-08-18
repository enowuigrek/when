import { getTenantIdBySlug } from "@/lib/tenant";
import { getSettingsForTenant } from "@/lib/db/for-tenant";
import { ThemeApplier } from "@/components/theme-applier";

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

  const settings = await getSettingsForTenant(tenantId);
  const theme = settings.theme === "light" ? "light" : "dark";

  return (
    <div data-theme={theme}>
      <ThemeApplier theme={theme} />
      {children}
    </div>
  );
}
