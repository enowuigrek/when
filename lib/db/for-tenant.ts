/**
 * DB query helpers that accept an explicit tenantId instead of reading from
 * the admin/demo cookie. Used by public widget pages where the tenant is
 * resolved from the URL slug, not session state.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Service, BusinessHours } from "@/lib/types";
import type { Settings, TimeFilter } from "@/lib/db/settings";
import type { Staff } from "@/lib/db/staff";
import type { CreateBookingInput, CreateBookingResult } from "@/lib/db/bookings";

const FALLBACK_SETTINGS: Settings = {
  id: 1,
  business_name: "when?",
  tagline: null,
  description: null,
  address_street: null,
  address_city: null,
  address_postal: null,
  phone: null,
  email: null,
  instagram_url: null,
  facebook_url: null,
  website_url: null,
  maps_url: null,
  logo_url: null,
  slot_granularity_min: 15,
  booking_horizon_days: 21,
  color_accent: "#d4a26a",
  theme: "system" as const,
};

export async function getServicesForTenant(tenantId: string): Promise<Service[]> {
  const { data } = await createAdminClient()
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as Service[];
}

export async function getServiceBySlugForTenant(slug: string, tenantId: string): Promise<Service | null> {
  const { data } = await createAdminClient()
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return data as Service | null;
}

export async function getBusinessHoursForTenant(tenantId: string): Promise<BusinessHours[]> {
  const { data } = await createAdminClient()
    .from("business_hours")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("day_of_week");
  return (data ?? []) as BusinessHours[];
}

export async function getActiveStaffForTenant(tenantId: string): Promise<Staff[]> {
  const { data } = await createAdminClient()
    .from("staff")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as Staff[];
}

export async function getSettingsForTenant(tenantId: string): Promise<Settings> {
  const { data } = await createAdminClient()
    .from("settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data as Settings | null) ?? FALLBACK_SETTINGS;
}

export async function getTimeFiltersForTenant(tenantId: string): Promise<TimeFilter[]> {
  const { data } = await createAdminClient()
    .from("time_filters")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as TimeFilter[];
}

export async function getBookingsInRangeForTenant(
  startIso: string,
  endIso: string,
  tenantId: string,
  staffId?: string,
  excludeBookingId?: string
): Promise<{ startsAtIso: string; endsAtIso: string }[]> {
  let query = createAdminClient()
    .from("bookings")
    .select("starts_at, ends_at")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmed")
    .lt("starts_at", endIso)
    .gt("ends_at", startIso);
  if (staffId) query = query.eq("staff_id", staffId);
  if (excludeBookingId) query = query.neq("id", excludeBookingId);
  const { data } = await query;
  return (data ?? []).map((b) => ({ startsAtIso: b.starts_at, endsAtIso: b.ends_at }));
}

export async function createBookingForTenant(
  input: CreateBookingInput,
  tenantId: string
): Promise<CreateBookingResult> {
  const { data, error } = await createAdminClient()
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
    if (error.code === "23P01") return { ok: false, error: "slot_taken", message: "Ten termin jest już zajęty." };
    return { ok: false, error: "db", message: error.message };
  }
  return { ok: true, id: (data as { id: string }).id };
}

export async function getStaffAvailabilityMapForTenant(
  staffIds: string[],
  dateStr: string,
  tenantId: string
): Promise<Map<string, { available: boolean; startTime: string | null; endTime: string | null }>> {
  if (staffIds.length === 0) return new Map();
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  const supabase = createAdminClient();

  const [timeOffRes, scheduleRes] = await Promise.all([
    supabase
      .from("staff_time_off")
      .select("staff_id")
      .eq("tenant_id", tenantId)
      .in("staff_id", staffIds)
      .lte("start_date", dateStr)
      .gte("end_date", dateStr),
    supabase
      .from("staff_schedules")
      .select("staff_id, start_time, end_time")
      .eq("tenant_id", tenantId)
      .in("staff_id", staffIds)
      .eq("day_of_week", dayOfWeek),
  ]);

  const onLeave = new Set((timeOffRes.data ?? []).map((r) => r.staff_id as string));
  const scheduleMap = new Map(
    (scheduleRes.data ?? []).map((r) => [
      r.staff_id as string,
      { start_time: r.start_time as string | null, end_time: r.end_time as string | null },
    ])
  );

  const result = new Map<string, { available: boolean; startTime: string | null; endTime: string | null }>();
  for (const id of staffIds) {
    if (onLeave.has(id)) { result.set(id, { available: false, startTime: null, endTime: null }); continue; }
    const sched = scheduleMap.get(id);
    if (sched) {
      if (!sched.start_time || !sched.end_time) result.set(id, { available: false, startTime: null, endTime: null });
      else result.set(id, { available: true, startTime: sched.start_time.slice(0, 5), endTime: sched.end_time.slice(0, 5) });
    } else {
      result.set(id, { available: true, startTime: null, endTime: null });
    }
  }
  return result;
}

export async function getStaffUnavailableDatesMapForTenant(
  staffIds: string[],
  startDate: string,
  endDate: string,
  tenantId: string
): Promise<Map<string, string[]>> {
  if (staffIds.length === 0) return new Map(staffIds.map((id) => [id, []]));
  const supabase = createAdminClient();
  const result = new Map<string, Set<string>>(staffIds.map((id) => [id, new Set()]));

  const [timeOffRes, scheduleRes] = await Promise.all([
    supabase
      .from("staff_time_off")
      .select("staff_id, start_date, end_date")
      .eq("tenant_id", tenantId)
      .in("staff_id", staffIds)
      .lte("start_date", endDate)
      .gte("end_date", startDate),
    supabase
      .from("staff_schedules")
      .select("staff_id, day_of_week, start_time, end_time")
      .eq("tenant_id", tenantId)
      .in("staff_id", staffIds),
  ]);

  const rangeStart = new Date(`${startDate}T00:00:00Z`);
  const rangeEnd = new Date(`${endDate}T00:00:00Z`);

  for (const r of timeOffRes.data ?? []) {
    const sid = r.staff_id as string;
    const set = result.get(sid);
    if (!set) continue;
    let cur = new Date(`${r.start_date as string}T00:00:00Z`);
    const end = new Date(`${r.end_date as string}T00:00:00Z`);
    if (cur < rangeStart) cur = rangeStart;
    const lastDay = end > rangeEnd ? rangeEnd : end;
    while (cur <= lastDay) { set.add(cur.toISOString().slice(0, 10)); cur = new Date(cur.getTime() + 86400000); }
  }

  const offDays = new Map<string, Set<number>>(staffIds.map((id) => [id, new Set()]));
  for (const s of scheduleRes.data ?? []) {
    if (!s.start_time || !s.end_time) offDays.get(s.staff_id as string)?.add(s.day_of_week as number);
  }

  let cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    const iso = cur.toISOString().slice(0, 10);
    const dow = cur.getUTCDay();
    for (const sid of staffIds) {
      if (offDays.get(sid)?.has(dow)) result.get(sid)!.add(iso);
    }
    cur = new Date(cur.getTime() + 86400000);
  }

  return new Map([...result.entries()].map(([k, v]) => [k, [...v]]));
}
