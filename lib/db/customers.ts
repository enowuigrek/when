import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Customer = {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function searchCustomersByPhone(query: string): Promise<Customer[]> {
  if (query.length < 3) return [];
  const { data } = await createAdminClient()
    .from("customers")
    .select("*")
    .ilike("phone", `%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(6);
  return (data ?? []) as Customer[];
}

export async function upsertCustomer(data: {
  phone: string;
  name: string;
  email: string | null;
}): Promise<string> {
  const { data: result, error } = await createAdminClient()
    .from("customers")
    .upsert(
      { phone: data.phone, name: data.name, email: data.email, updated_at: new Date().toISOString() },
      { onConflict: "phone" }
    )
    .select("id")
    .single();
  if (error) throw new Error(`upsertCustomer: ${error.message}`);
  return result.id;
}

export async function getAllCustomers(): Promise<Customer[]> {
  const { data } = await createAdminClient()
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []) as Customer[];
}

export type CustomerSummary = Customer & {
  visitCount: number;
  totalSpent: number;
  lastVisit: string | null;
  noShowCount: number;
};

export async function getAllCustomersWithStats(): Promise<CustomerSummary[]> {
  const [customers, bookingsRaw] = await Promise.all([
    createAdminClient().from("customers").select("*").order("updated_at", { ascending: false }),
    createAdminClient()
      .from("bookings")
      .select("customer_phone, status, starts_at, service:services(price_pln)"),
  ]);

  const now = new Date().toISOString();
  type BookingRow = { customer_phone: string; status: string; starts_at: string; service: { price_pln: number } | null };
  const bookings = (bookingsRaw.data ?? []) as unknown as BookingRow[];

  const byPhone = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const arr = byPhone.get(b.customer_phone) ?? [];
    arr.push(b);
    byPhone.set(b.customer_phone, arr);
  }

  return (customers.data ?? []).map((c) => {
    const cBookings = byPhone.get(c.phone) ?? [];
    const past = cBookings.filter((b) => (b.status === "confirmed" || b.status === "completed") && b.starts_at < now);
    const lastVisit = past.sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0]?.starts_at ?? null;
    return {
      ...(c as Customer),
      visitCount: past.length,
      totalSpent: past.reduce((s, b) => s + (b.service?.price_pln ?? 0), 0),
      lastVisit,
      noShowCount: cBookings.filter((b) => b.status === "no_show").length,
    };
  });
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  const { data } = await createAdminClient()
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  return data as Customer | null;
}

export type CustomerBooking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  service: { name: string; price_pln: number; duration_min: number } | null;
  staff: { name: string; color: string } | null;
};

export type CustomerStats = {
  totalVisits: number;
  totalSpent: number;
  cancelledCount: number;
  noShowCount: number;
  lastVisit: string | null;
  nextVisit: string | null;
  favoriteService: string | null;
  avgDaysBetweenVisits: number | null;
  bookings: CustomerBooking[];
};

export async function getCustomerStats(phone: string): Promise<CustomerStats> {
  const { data } = await createAdminClient()
    .from("bookings")
    .select("id, starts_at, ends_at, status, notes, service:services(name, price_pln, duration_min), staff:staff(name, color)")
    .eq("customer_phone", phone)
    .order("starts_at", { ascending: false });

  const bookings = (data ?? []) as unknown as CustomerBooking[];
  const now = new Date().toISOString();

  const confirmed = bookings.filter((b) => b.status === "confirmed" || b.status === "completed");
  const past = confirmed.filter((b) => b.starts_at < now);
  const future = confirmed.filter((b) => b.starts_at >= now);

  const totalSpent = past.reduce((sum, b) => sum + (b.service?.price_pln ?? 0), 0);
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;
  const noShowCount = bookings.filter((b) => b.status === "no_show").length;
  const lastVisit = past[0]?.starts_at ?? null;
  const nextVisit = future[future.length - 1]?.starts_at ?? null;

  // Favorite service
  const serviceCounts = new Map<string, number>();
  for (const b of past) {
    if (b.service?.name) serviceCounts.set(b.service.name, (serviceCounts.get(b.service.name) ?? 0) + 1);
  }
  const favoriteService = serviceCounts.size > 0
    ? [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Avg days between visits
  let avgDaysBetweenVisits: number | null = null;
  const pastDates = past.map((b) => new Date(b.starts_at).getTime()).sort((a, b) => a - b);
  if (pastDates.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < pastDates.length; i++) {
      gaps.push((pastDates[i] - pastDates[i - 1]) / (1000 * 60 * 60 * 24));
    }
    avgDaysBetweenVisits = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
  }

  return { totalVisits: past.length, totalSpent, cancelledCount, noShowCount, lastVisit, nextVisit, favoriteService, avgDaysBetweenVisits, bookings };
}
