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
    })
    .select("id")
    .single();

  if (error) {
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
  service: { name: string; duration_min: number; price_pln: number } | null;
  staff: { name: string; color: string } | null;
};

export async function getBookingsBetween(
  startIso: string,
  endIso: string
): Promise<BookingWithService[]> {
  const tenantId = await getAdminTenantId();
  const { data, error } = await createAdminClient()
    .from("bookings")
    .select("*, service:services(name, duration_min, price_pln), staff:staff(name, color)")
    .eq("tenant_id", tenantId)
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`Failed to load bookings: ${error.message}`);
  return (data ?? []) as BookingWithService[];
}

/** Count confirmed bookings for a group service in a given time window (capacity check). */
export async function getGroupBookingCount(
  serviceId: string,
  startsAtIso: string,
  endsAtIso: string
): Promise<number> {
  const tenantId = await getAdminTenantId();
  const { count } = await createAdminClient()
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .eq("status", "confirmed")
    .lt("starts_at", endsAtIso)
    .gt("ends_at", startsAtIso);
  return count ?? 0;
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
  const { data, error } = await createAdminClient()
    .from("bookings")
    .select("*, service:services(name, slug, duration_min, price_pln)")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load booking: ${error.message}`);
  return data;
}
