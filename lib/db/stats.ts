import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

const TZ = "Europe/Warsaw";

/** Format a UTC Date as YYYY-MM-DD in Warsaw timezone */
function warsawDateStr(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Warsaw "today" as YYYY-MM-DD */
function warsawToday(): string {
  return warsawDateStr(new Date());
}

/** First day of current month in Warsaw, returned as UTC ISO (midnight UTC) */
function startOfThisMonthUtc(): string {
  const today = warsawToday();
  const [y, m] = today.split("-");
  return `${y}-${m}-01T00:00:00.000Z`;
}

export type ChartPoint = { date: string; count: number };

export type TopService = { name: string; count: number; revenue: number };

export type TopStaff = { name: string; count: number };

export type RecentBooking = {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceId: string | null;
  serviceName: string;
  staffId: string | null;
  staffName: string | null;
  staffColor: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  pricePln: number | null;
  notes: string | null;
};

export type DashboardStats = {
  thisMonthBookings: number;
  thisMonthRevenue: number;
  totalCustomers: number;
  todayBookings: number;
  chartData: ChartPoint[];   // last 30 days, Warsaw dates
  topServices: TopService[];
  topStaff: TopStaff[];
  recentBookings: RecentBooking[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  const today = warsawToday();
  const monthStart = startOfThisMonthUtc();

  // 30 days ago (UTC)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  // Tomorrow start UTC (for today's upper bound)
  const [ty, tm, td] = today.split("-").map(Number);
  const tomorrowUtc = new Date(Date.UTC(ty, tm - 1, td + 1)).toISOString();
  const todayUtc = new Date(Date.UTC(ty, tm - 1, td)).toISOString();

  const [
    monthBookingsRes,
    thirtyDayBookingsRes,
    todayCountRes,
    customersRes,
    recentRes,
  ] = await Promise.all([
    // This month: all confirmed+completed bookings
    supabase
      .from("bookings")
      .select("price_pln_snapshot, starts_at, service:services(name), staff:staff(name)")
      .eq("tenant_id", tenantId)
      .in("status", ["confirmed", "completed"])
      .gte("starts_at", monthStart),

    // Last 30 days for chart + top services/staff
    supabase
      .from("bookings")
      .select("starts_at, price_pln_snapshot, service:services(name), staff:staff(name)")
      .eq("tenant_id", tenantId)
      .in("status", ["confirmed", "completed"])
      .gte("starts_at", thirtyDaysAgo),

    // Today count
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["confirmed", "completed"])
      .gte("starts_at", todayUtc)
      .lt("starts_at", tomorrowUtc),

    // Total customers
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),

    // Recent 6 bookings (newest first) — includes fields needed by the
    // booking-management modal (customer_phone, service_id, staff_id…).
    supabase
      .from("bookings")
      .select("id, customer_name, customer_phone, starts_at, ends_at, status, price_pln_snapshot, notes, service_id, staff_id, service:services(name), staff:staff(name, color)")
      .eq("tenant_id", tenantId)
      .in("status", ["confirmed", "completed", "cancelled", "no_show"])
      .order("starts_at", { ascending: false })
      .limit(6),
  ]);

  // ── This month KPIs ────────────────────────────────────────────────────────
  const monthRows = (monthBookingsRes.data ?? []) as unknown as {
    price_pln_snapshot: number | null;
    starts_at: string;
    service: { name: string } | null;
    staff: { name: string } | null;
  }[];

  const thisMonthBookings = monthRows.length;
  const thisMonthRevenue = monthRows.reduce((s, r) => s + (r.price_pln_snapshot ?? 0), 0);

  // ── 30-day chart ──────────────────────────────────────────────────────────
  const thirtyRows = (thirtyDayBookingsRes.data ?? []) as unknown as {
    starts_at: string;
    price_pln_snapshot: number | null;
    service: { name: string } | null;
    staff: { name: string } | null;
  }[];

  // Build a map of date → count (Warsaw dates)
  const chartMap = new Map<string, number>();
  // Initialise all 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const d = warsawDateStr(new Date(Date.now() - i * 86_400_000));
    chartMap.set(d, 0);
  }
  for (const r of thirtyRows) {
    const d = warsawDateStr(new Date(r.starts_at));
    if (chartMap.has(d)) chartMap.set(d, (chartMap.get(d) ?? 0) + 1);
  }
  const chartData: ChartPoint[] = [...chartMap.entries()].map(([date, count]) => ({ date, count }));

  // ── Top services (this month) ─────────────────────────────────────────────
  const svcMap = new Map<string, { count: number; revenue: number }>();
  for (const r of monthRows) {
    const name = (r.service as { name: string } | null)?.name ?? "—";
    const prev = svcMap.get(name) ?? { count: 0, revenue: 0 };
    svcMap.set(name, { count: prev.count + 1, revenue: prev.revenue + (r.price_pln_snapshot ?? 0) });
  }
  const topServices: TopService[] = [...svcMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Top staff (this month) ────────────────────────────────────────────────
  const staffMap = new Map<string, number>();
  for (const r of monthRows) {
    const name = (r.staff as { name: string } | null)?.name;
    if (!name) continue;
    staffMap.set(name, (staffMap.get(name) ?? 0) + 1);
  }
  const topStaff: TopStaff[] = [...staffMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Recent bookings ───────────────────────────────────────────────────────
  type RawRecent = {
    id: string;
    customer_name: string;
    customer_phone: string;
    starts_at: string;
    ends_at: string;
    status: string;
    price_pln_snapshot: number | null;
    notes: string | null;
    service_id: string | null;
    staff_id: string | null;
    service: { name: string } | null;
    staff: { name: string; color: string } | null;
  };
  const recentBookings: RecentBooking[] = ((recentRes.data ?? []) as unknown as RawRecent[]).map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    serviceId: r.service_id,
    serviceName: (r.service as { name: string } | null)?.name ?? "—",
    staffId: r.staff_id,
    staffName: (r.staff as { name: string } | null)?.name ?? null,
    staffColor: (r.staff as { color: string } | null)?.color ?? null,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    status: r.status,
    pricePln: r.price_pln_snapshot,
    notes: r.notes,
  }));

  return {
    thisMonthBookings,
    thisMonthRevenue,
    totalCustomers: customersRes.count ?? 0,
    todayBookings: todayCountRes.count ?? 0,
    chartData,
    topServices,
    topStaff,
    recentBookings,
  };
}
