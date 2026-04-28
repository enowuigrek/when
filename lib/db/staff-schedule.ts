import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

export type StaffScheduleRow = {
  staff_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
};

export type StaffTimeOff = {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  type: "sick" | "vacation" | "personal" | "other";
  note: string | null;
  created_at: string;
};

export async function getStaffSchedule(staffId: string): Promise<StaffScheduleRow[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("staff_schedules")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId)
    .order("day_of_week");
  return (data ?? []) as StaffScheduleRow[];
}

export async function upsertStaffSchedule(
  staffId: string,
  rows: { day_of_week: number; start_time: string | null; end_time: string | null }[]
): Promise<void> {
  const tenantId = await getAdminTenantId();
  const payload = rows.map((r) => ({ ...r, staff_id: staffId, tenant_id: tenantId }));
  await createAdminClient().from("staff_schedules").upsert(payload, { onConflict: "tenant_id,staff_id,day_of_week" });
}

export async function getStaffTimeOff(staffId: string): Promise<StaffTimeOff[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("staff_time_off")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId)
    .order("start_date", { ascending: false });
  return (data ?? []) as StaffTimeOff[];
}

export async function addStaffTimeOff(input: Omit<StaffTimeOff, "id" | "created_at">): Promise<void> {
  const tenantId = await getAdminTenantId();
  await createAdminClient().from("staff_time_off").insert({ ...input, tenant_id: tenantId });
}

export async function deleteStaffTimeOff(id: string): Promise<void> {
  const tenantId = await getAdminTenantId();
  await createAdminClient().from("staff_time_off").delete().eq("tenant_id", tenantId).eq("id", id);
}

export async function getAllStaffSchedules(): Promise<StaffScheduleRow[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient().from("staff_schedules").select("*").eq("tenant_id", tenantId);
  return (data ?? []) as StaffScheduleRow[];
}

export async function getTimeOffInRange(startDate: string, endDate: string): Promise<StaffTimeOff[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("staff_time_off")
    .select("*")
    .eq("tenant_id", tenantId)
    .lte("start_date", endDate)
    .gte("end_date", startDate);
  return (data ?? []) as StaffTimeOff[];
}

export async function getStaffUnavailableDatesMap(
  staffIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>(staffIds.map((id) => [id, new Set<string>()]));
  if (staffIds.length === 0) return result;
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  const { data: timeOff } = await supabase
    .from("staff_time_off")
    .select("staff_id, start_date, end_date")
    .eq("tenant_id", tenantId)
    .in("staff_id", staffIds)
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  const rangeStart = new Date(`${startDate}T00:00:00Z`);
  const rangeEnd = new Date(`${endDate}T00:00:00Z`);
  for (const r of timeOff ?? []) {
    const sid = r.staff_id as string;
    const set = result.get(sid)!;
    let cur = new Date(`${(r.start_date as string)}T00:00:00Z`);
    const end = new Date(`${(r.end_date as string)}T00:00:00Z`);
    if (cur < rangeStart) cur = rangeStart;
    const lastDay = end > rangeEnd ? rangeEnd : end;
    while (cur <= lastDay) {
      set.add(cur.toISOString().slice(0, 10));
      cur = new Date(cur.getTime() + 86400000);
    }
  }

  const { data: schedules } = await supabase
    .from("staff_schedules")
    .select("staff_id, day_of_week, start_time, end_time")
    .eq("tenant_id", tenantId)
    .in("staff_id", staffIds);

  const offDays = new Map<string, Set<number>>(staffIds.map((id) => [id, new Set<number>()]));
  for (const s of schedules ?? []) {
    if (!s.start_time || !s.end_time) {
      offDays.get(s.staff_id as string)!.add(s.day_of_week as number);
    }
  }

  let cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    const iso = cur.toISOString().slice(0, 10);
    const dow = cur.getUTCDay();
    for (const sid of staffIds) {
      if (offDays.get(sid)!.has(dow)) result.get(sid)!.add(iso);
    }
    cur = new Date(cur.getTime() + 86400000);
  }

  return result;
}

export async function upsertOneDaySchedule(
  staffId: string,
  dayOfWeek: number,
  startTime: string | null,
  endTime: string | null
): Promise<void> {
  const tenantId = await getAdminTenantId();
  await createAdminClient()
    .from("staff_schedules")
    .upsert(
      { tenant_id: tenantId, staff_id: staffId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime },
      { onConflict: "tenant_id,staff_id,day_of_week" }
    );
}

export async function getStaffAvailabilityMap(
  staffIds: string[],
  dateStr: string
): Promise<Map<string, { available: boolean; startTime: string | null; endTime: string | null }>> {
  if (staffIds.length === 0) return new Map();
  const tenantId = await getAdminTenantId();

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
    if (onLeave.has(id)) {
      result.set(id, { available: false, startTime: null, endTime: null });
      continue;
    }
    const sched = scheduleMap.get(id);
    if (sched) {
      if (!sched.start_time || !sched.end_time) {
        result.set(id, { available: false, startTime: null, endTime: null });
      } else {
        result.set(id, {
          available: true,
          startTime: sched.start_time.slice(0, 5),
          endTime: sched.end_time.slice(0, 5),
        });
      }
    } else {
      result.set(id, { available: true, startTime: null, endTime: null });
    }
  }

  return result;
}
