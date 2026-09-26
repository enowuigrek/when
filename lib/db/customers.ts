import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

export type Customer = {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /**
   * Who is called about this person. A child attends and holds the karnet;
   * the parent is the contact, and the two share the phone number.
   */
  guardian_id: string | null;
};

/**
 * The customer book, searched by whichever of the two the person is typing.
 *
 * It used to match the phone column only, so starting from the name — which is
 * what you do when someone rings and says who they are — found nobody, and the
 * booking quietly created a second customer row for someone already in there.
 */
export async function searchCustomers(query: string): Promise<Customer[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const tenantId = await getAdminTenantId();
  // PostgREST needs the commas inside or() to separate filters, so a comma
  // typed into the box would split it into nonsense filters. Nothing else in
  // the pattern is special to ilike beyond % and _, which are useful here.
  const safe = q.replace(/[,()]/g, " ");
  const { data } = await createAdminClient()
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .or(`phone.ilike.%${safe}%,name.ilike.%${safe}%`)
    .order("updated_at", { ascending: false })
    .limit(6);
  return (data ?? []) as Customer[];
}

export async function upsertCustomer(data: {
  phone: string;
  name: string;
  email: string | null;
}): Promise<string> {
  return upsertCustomerForTenant(data, await getAdminTenantId());
}

/**
 * Same, with the tenant handed in — for public and widget paths, which have no
 * admin session to read one from.
 */
/**
 * The person reachable at this number.
 *
 * Read-then-write rather than an upsert: the phone is unique only among
 * clients who have no guardian — a child shares its parent's number, and
 * three siblings would otherwise fight over one row. A partial unique index
 * cannot be named as an ON CONFLICT target through the client, so the lookup
 * is explicit.
 */
export async function upsertCustomerForTenant(
  data: { phone: string; name: string; email: string | null },
  tenantId: string
): Promise<string> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", data.phone)
    .is("guardian_id", null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("customers")
      .update({ name: data.name, email: data.email, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(`upsertCustomer: ${error.message}`);
    return existing.id as string;
  }

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      phone: data.phone,
      name: data.name,
      email: data.email,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`upsertCustomer: ${error.message}`);
  return created.id as string;
}

/**
 * The person who attends, under the person who is called about it.
 *
 * Matched on the name within one guardian, because that is how a parent
 * identifies their own child to a studio — there is no other handle, and
 * inventing one would mean asking a parent for their child's phone number.
 */
export async function upsertChildForTenant(
  data: { name: string; guardianId: string; guardianPhone: string },
  tenantId: string
): Promise<string> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("guardian_id", data.guardianId)
    .ilike("name", data.name)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      // Kept in step with the guardian so a call from the child's profile
      // reaches somebody. The child is not reachable at it; the parent is.
      phone: data.guardianPhone,
      name: data.name,
      guardian_id: data.guardianId,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`upsertChild: ${error.message}`);
  return created.id as string;
}

export async function getAllCustomers(): Promise<Customer[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as Customer[];
}

export type CustomerSummary = Customer & {
  /** Set on a child: the name of whoever is called about them. */
  guardianName: string | null;
  /** Set on a guardian: how many people they are the contact for. */
  childCount: number;
  visitCount: number;
  totalSpent: number;
  lastVisit: string | null;
  noShowCount: number;
};

export async function getAllCustomersWithStats(): Promise<CustomerSummary[]> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const [customers, bookingsRaw] = await Promise.all([
    supabase.from("customers").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("customer_phone, customer_name, status, starts_at, service:services(price_pln)")
      .eq("tenant_id", tenantId),
  ]);

  const now = new Date().toISOString();
  type BookingRow = { customer_phone: string; customer_name: string; status: string; starts_at: string; service: { price_pln: number } | null };
  const bookings = (bookingsRaw.data ?? []) as unknown as BookingRow[];

  // Keyed by number and name together: siblings share a phone, and keying on
  // it alone gave every child the whole family's history.
  const key = (phone: string, name: string) => `${phone}|${name.trim().toLowerCase()}`;
  const byPerson = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const k = key(b.customer_phone, b.customer_name);
    const arr = byPerson.get(k) ?? [];
    arr.push(b);
    byPerson.set(k, arr);
  }

  const all = (customers.data ?? []) as Customer[];
  const nameById = new Map(all.map((c) => [c.id, c.name]));
  const childCounts = new Map<string, number>();
  for (const c of all) {
    if (c.guardian_id) childCounts.set(c.guardian_id, (childCounts.get(c.guardian_id) ?? 0) + 1);
  }

  return all.map((c) => {
    const cBookings = byPerson.get(key(c.phone, c.name)) ?? [];
    const past = cBookings.filter((b) => (b.status === "confirmed" || b.status === "completed") && b.starts_at < now);
    const lastVisit = past.sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0]?.starts_at ?? null;
    return {
      ...(c as Customer),
      guardianName: c.guardian_id ? nameById.get(c.guardian_id) ?? null : null,
      childCount: childCounts.get(c.id) ?? 0,
      visitCount: past.length,
      totalSpent: past.reduce((s, b) => s + (b.service?.price_pln ?? 0), 0),
      lastVisit,
      noShowCount: cBookings.filter((b) => b.status === "no_show").length,
    };
  });
}

/**
 * The people this client is filed with: who is called about them, and who
 * they are called about.
 */
export async function getFamily(customer: {
  id: string;
  guardian_id: string | null;
}): Promise<{ guardian: Customer | null; children: Customer[] }> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const [guardianRes, childrenRes] = await Promise.all([
    customer.guardian_id
      ? supabase.from("customers").select("*").eq("tenant_id", tenantId).eq("id", customer.guardian_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("customers").select("*").eq("tenant_id", tenantId).eq("guardian_id", customer.id).order("name"),
  ]);
  return {
    guardian: (guardianRes.data as Customer | null) ?? null,
    children: ((childrenRes as { data: Customer[] | null }).data ?? []) as Customer[],
  };
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
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
  staff_id: string | null;
  package_id: string | null;
  /** What this visit was agreed at. Null for bookings made before snapshots. */
  price_pln_snapshot: number | null;
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

/**
 * One person's history.
 *
 * Matched on the number *and* the name, not the number alone. A parent and
 * their children share one phone, so a family of four all had each other's
 * visits, each other's spend and each other's next appointment.
 */
export async function getCustomerStats(phone: string, name: string): Promise<CustomerStats> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("bookings")
    .select("id, starts_at, ends_at, status, notes, staff_id, package_id, price_pln_snapshot, service:services(name, price_pln, duration_min), staff:staff(name, color)")
    .eq("tenant_id", tenantId)
    .eq("customer_phone", phone)
    .ilike("customer_name", name)
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
