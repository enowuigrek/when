import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type TenantWithStats = {
  id: string;
  name: string;
  slug: string;
  kind: "main" | "demo" | "customer";
  email: string | null;
  is_super_admin: boolean;
  created_at: string;
  notes: string | null;
  bookingsTotal: number;
  bookings30d: number;
  revenue30d: number;
  staffCount: number;
  serviceCount: number;
  customerCount: number;
  lastBookingAt: string | null;
};

export type PlatformSummary = {
  totalTenants: number;
  activeTenants30d: number;
  newTenantsThisMonth: number;
  totalBookings: number;
  revenue30d: number;
  feedbackNew: number;
};

export async function getAllTenantsWithStats(): Promise<{
  tenants: TenantWithStats[];
  summary: PlatformSummary;
}> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data: rawTenants } = await supabase
    .from("tenants")
    .select("id, name, slug, kind, email, is_super_admin, created_at, notes")
    .neq("kind", "demo")
    .order("created_at");

  if (!rawTenants || rawTenants.length === 0) {
    return {
      tenants: [],
      summary: { totalTenants: 0, activeTenants30d: 0, newTenantsThisMonth: 0, totalBookings: 0, revenue30d: 0, feedbackNew: 0 },
    };
  }

  const ids = rawTenants.map((t) => t.id as string);

  const [bookingRes, booking30dRes, staffRes, serviceRes, customerRes, feedbackRes] = await Promise.all([
    supabase.from("bookings").select("tenant_id").in("tenant_id", ids),
    supabase
      .from("bookings")
      .select("tenant_id, price_pln_snapshot, created_at")
      .in("tenant_id", ids)
      .gte("created_at", thirtyDaysAgo),
    supabase.from("staff").select("tenant_id").in("tenant_id", ids),
    supabase.from("services").select("tenant_id").in("tenant_id", ids),
    supabase.from("customers").select("tenant_id").in("tenant_id", ids),
    supabase.from("feedback").select("id, status").eq("status", "new"),
  ]);

  function countByTenant(rows: Array<{ tenant_id: string }> | null): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.tenant_id, (m.get(r.tenant_id) ?? 0) + 1);
    return m;
  }

  const bookingTotalMap = countByTenant(bookingRes.data as Array<{ tenant_id: string }> | null);
  const staffMap = countByTenant(staffRes.data as Array<{ tenant_id: string }> | null);
  const serviceMap = countByTenant(serviceRes.data as Array<{ tenant_id: string }> | null);
  const customerMap = countByTenant(customerRes.data as Array<{ tenant_id: string }> | null);

  // 30d bookings: count + revenue per tenant
  const booking30dMap = new Map<string, { count: number; revenue: number }>();
  for (const r of (booking30dRes.data ?? []) as Array<{ tenant_id: string; price_pln_snapshot: number | null }>) {
    const prev = booking30dMap.get(r.tenant_id) ?? { count: 0, revenue: 0 };
    booking30dMap.set(r.tenant_id, {
      count: prev.count + 1,
      revenue: prev.revenue + (r.price_pln_snapshot ?? 0),
    });
  }

  // Last booking per tenant
  const lastBookingMap = new Map<string, string>();
  for (const r of (booking30dRes.data ?? []) as Array<{ tenant_id: string; created_at: string }>) {
    const existing = lastBookingMap.get(r.tenant_id);
    if (!existing || r.created_at > existing) lastBookingMap.set(r.tenant_id, r.created_at);
  }
  // Also check total bookings for older last-booking dates — but we only fetched 30d.
  // For "last booking ever" we'd need a separate query. Let's do a targeted one:
  const { data: lastBookings } = await supabase
    .from("bookings")
    .select("tenant_id, created_at")
    .in("tenant_id", ids)
    .order("created_at", { ascending: false });
  const lastBookingEverMap = new Map<string, string>();
  for (const r of (lastBookings ?? []) as Array<{ tenant_id: string; created_at: string }>) {
    if (!lastBookingEverMap.has(r.tenant_id)) lastBookingEverMap.set(r.tenant_id, r.created_at);
  }

  const tenants: TenantWithStats[] = rawTenants.map((t) => {
    const id = t.id as string;
    const b30 = booking30dMap.get(id);
    return {
      id,
      name: t.name as string,
      slug: t.slug as string,
      kind: t.kind as "main" | "demo" | "customer",
      email: (t.email as string | null) ?? null,
      is_super_admin: Boolean(t.is_super_admin),
      created_at: t.created_at as string,
      notes: (t.notes as string | null) ?? null,
      bookingsTotal: bookingTotalMap.get(id) ?? 0,
      bookings30d: b30?.count ?? 0,
      revenue30d: b30?.revenue ?? 0,
      staffCount: staffMap.get(id) ?? 0,
      serviceCount: serviceMap.get(id) ?? 0,
      customerCount: customerMap.get(id) ?? 0,
      lastBookingAt: lastBookingEverMap.get(id) ?? null,
    };
  });

  const now = new Date();
  const summary: PlatformSummary = {
    totalTenants: tenants.length,
    activeTenants30d: tenants.filter((t) => t.bookings30d > 0).length,
    newTenantsThisMonth: tenants.filter((t) => t.created_at >= monthStart).length,
    totalBookings: tenants.reduce((s, t) => s + t.bookingsTotal, 0),
    revenue30d: tenants.reduce((s, t) => s + t.revenue30d, 0),
    feedbackNew: (feedbackRes.data ?? []).length,
  };

  return { tenants, summary };
}

export async function getTenantDetail(tenantId: string): Promise<TenantWithStats | null> {
  const { tenants } = await getAllTenantsWithStats();
  return tenants.find((t) => t.id === tenantId) ?? null;
}

export type FeedbackRow = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  message: string;
  category: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAllFeedback(): Promise<FeedbackRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("feedback")
    .select("*, tenant:tenants(name)")
    .order("created_at", { ascending: false });

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    tenant_id: r.tenant_id as string,
    tenant_name: ((r.tenant as { name: string } | null)?.name) ?? "—",
    message: r.message as string,
    category: r.category as string,
    status: r.status as string,
    admin_reply: (r.admin_reply as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}

export async function getFeedbackForTenant(tenantId: string): Promise<FeedbackRow[]> {
  const all = await getAllFeedback();
  return all.filter((f) => f.tenant_id === tenantId);
}
