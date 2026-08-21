import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

/**
 * Fetch confirmed bookings overlapping a UTC instant range.
 * Used to know which slots are taken on a given day.
 */
export async function getBookingsInRange(
  startIso: string,
  endIso: string,
  staffId?: string,
  excludeBookingId?: string
): Promise<{ startsAtIso: string; endsAtIso: string }[]> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  let query = supabase
    .from("bookings")
    .select("starts_at, ends_at")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmed")
    .lt("starts_at", endIso)
    .gt("ends_at", startIso);

  if (staffId) {
    query = query.eq("staff_id", staffId);
  }
  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to load bookings: ${error.message}`);
  return (data ?? []).map((b) => ({
    startsAtIso: b.starts_at,
    endsAtIso: b.ends_at,
  }));
}

export type CreateBookingInput = {
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  startsAtIso: string;
  endsAtIso: string;
  notes: string | null;
  staffId?: string | null;
  pricePlnSnapshot?: number | null;
  durationMinSnapshot?: number | null;
  /** Set when the service is sold as a package of lessons. */
  packageId?: string | null;
};

export type CreateBookingResult =
  | { ok: true; id: string }
  | { ok: false; error: "slot_taken" | "validation" | "db"; message: string };

export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      tenant_id: tenantId,
      service_id: input.serviceId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail,
      starts_at: input.startsAtIso,
      ends_at: input.endsAtIso,
      notes: input.notes,
      status: "confirmed",
      staff_id: input.staffId ?? null,
      price_pln_snapshot: input.pricePlnSnapshot ?? null,
      duration_min_snapshot: input.durationMinSnapshot ?? null,
      package_id: input.packageId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    // 23P01 = exclusion_violation (overlap constraint)
    if (error.code === "23P01") {
      return {
        ok: false,
        error: "slot_taken",
        message: "Ten termin został właśnie zajęty. Wybierz inny.",
      };
    }
    return { ok: false, error: "db", message: error.message };
  }

  return { ok: true, id: data.id };
}

export type BookingWithService = {
  id: string;
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  notes: string | null;
  created_at: string;
  staff_id: string | null;
  price_pln_snapshot: number | null;
  duration_min_snapshot: number | null;
  package_id: string | null;
  service: { name: string; duration_min: number; price_pln: number } | null;
  staff: { name: string; color: string } | null;
};

export async function getBookingsBetween(
  startIso: string,
  endIso: string
): Promise<BookingWithService[]> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, service:services(name, duration_min, price_pln), staff:staff(name, color)")
    .eq("tenant_id", tenantId)
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`Failed to load bookings: ${error.message}`);
  return (data ?? []) as BookingWithService[];
}

export async function getBusyStaffIds(
  startIso: string,
  endIso: string
): Promise<string[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("bookings")
    .select("staff_id")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmed")
    .not("staff_id", "is", null)
    .lt("starts_at", endIso)
    .gt("ends_at", startIso);
  return (data ?? []).map((b) => b.staff_id as string);
}

export async function getBookingById(id: string) {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, service:services(name, slug, duration_min, price_pln)")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load booking: ${error.message}`);
  return data;
}


/**
 * Bookings per Warsaw day across a range, for the schedule's calendar badges.
 *
 * Selects only starts_at rather than reusing getBookingsBetween: the calendar
 * spans a few months, and pulling joined rows for all of it to end up with a
 * handful of counts would be wasteful. Bucketing happens in JS because the
 * day boundary is Warsaw-local, not UTC.
 */
export async function getBookingCountsByDay(
  startIso: string,
  endIso: string
): Promise<Record<string, number>> {
  const tenantId = await getAdminTenantId();
  const { data, error } = await createAdminClient()
    .from("bookings")
    .select("starts_at")
    .eq("tenant_id", tenantId)
    .in("status", ["confirmed", "completed"])
    .gte("starts_at", startIso)
    .lt("starts_at", endIso);

  if (error) {
    console.error("[bookings] counts by day failed:", error.message);
    return {};
  }

  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const day = fmt.format(new Date(row.starts_at as string));
    out[day] = (out[day] ?? 0) + 1;
  }
  return out;
}
