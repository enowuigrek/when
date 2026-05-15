import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  kind: "main" | "demo" | "customer";
  email: string | null;
  is_super_admin: boolean;
  created_at: string;
  bookingCount: number;
  staffCount: number;
  serviceCount: number;
};

export type SuperAdminSummary = {
  tenantCount: number;
  totalBookings: number;
  totalStaff: number;
  totalServices: number;
};

export async function getAllTenantsWithStats(): Promise<{
  tenants: TenantRow[];
  summary: SuperAdminSummary;
}> {
  const supabase = createAdminClient();

  const { data: rawTenants } = await supabase
    .from("tenants")
    .select("id, name, slug, kind, email, is_super_admin, created_at")
    .neq("kind", "demo")
    .order("created_at");

  if (!rawTenants || rawTenants.length === 0) {
    return {
      tenants: [],
      summary: { tenantCount: 0, totalBookings: 0, totalStaff: 0, totalServices: 0 },
    };
  }

  const ids = rawTenants.map((t) => t.id as string);

  // Fetch only the tenant_id column from each table — lightweight even with many rows.
  const [bookingRes, staffRes, serviceRes] = await Promise.all([
    supabase.from("bookings").select("tenant_id").in("tenant_id", ids),
    supabase.from("staff").select("tenant_id").in("tenant_id", ids),
    supabase.from("services").select("tenant_id").in("tenant_id", ids),
  ]);

  function countByTenant(rows: Array<{ tenant_id: string }> | null): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      m.set(r.tenant_id, (m.get(r.tenant_id) ?? 0) + 1);
    }
    return m;
  }

  const bookingMap = countByTenant(bookingRes.data as Array<{ tenant_id: string }> | null);
  const staffMap = countByTenant(staffRes.data as Array<{ tenant_id: string }> | null);
  const serviceMap = countByTenant(serviceRes.data as Array<{ tenant_id: string }> | null);

  const tenants: TenantRow[] = rawTenants.map((t) => ({
    id: t.id as string,
    name: t.name as string,
    slug: t.slug as string,
    kind: t.kind as "main" | "demo" | "customer",
    email: (t.email as string | null) ?? null,
    is_super_admin: Boolean(t.is_super_admin),
    created_at: t.created_at as string,
    bookingCount: bookingMap.get(t.id as string) ?? 0,
    staffCount: staffMap.get(t.id as string) ?? 0,
    serviceCount: serviceMap.get(t.id as string) ?? 0,
  }));

  const summary: SuperAdminSummary = {
    tenantCount: tenants.length,
    totalBookings: tenants.reduce((s, t) => s + t.bookingCount, 0),
    totalStaff: tenants.reduce((s, t) => s + t.staffCount, 0),
    totalServices: tenants.reduce((s, t) => s + t.serviceCount, 0),
  };

  return { tenants, summary };
}
