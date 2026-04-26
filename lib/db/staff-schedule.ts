import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffScheduleRow = {
  staff_id: string;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string | null; // "HH:MM:SS" or null = not working
  end_time: string | null;
};

export type StaffTimeOff = {
  id: string;
  staff_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  type: "sick" | "vacation" | "personal" | "other";
  note: string | null;
  created_at: string;
};

export async function getStaffSchedule(staffId: string): Promise<StaffScheduleRow[]> {
  const { data } = await createAdminClient()
    .from("staff_schedules")
    .select("*")
    .eq("staff_id", staffId)
    .order("day_of_week");
  return (data ?? []) as StaffScheduleRow[];
}

export async function upsertStaffSchedule(
  staffId: string,
  rows: { day_of_week: number; start_time: string | null; end_time: string | null }[]
): Promise<void> {
  const payload = rows.map((r) => ({ ...r, staff_id: staffId }));
  await createAdminClient().from("staff_schedules").upsert(payload, { onConflict: "staff_id,day_of_week" });
}

export async function getStaffTimeOff(staffId: string): Promise<StaffTimeOff[]> {
  const { data } = await createAdminClient()
    .from("staff_time_off")
    .select("*")
    .eq("staff_id", staffId)
    .order("start_date", { ascending: false });
  return (data ?? []) as StaffTimeOff[];
}

export async function addStaffTimeOff(input: Omit<StaffTimeOff, "id" | "created_at">): Promise<void> {
  await createAdminClient().from("staff_time_off").insert(input);
}

export async function deleteStaffTimeOff(id: string): Promise<void> {
  await createAdminClient().from("staff_time_off").delete().eq("id", id);
}

export async function getAllStaffSchedules(): Promise<StaffScheduleRow[]> {
  const { data } = await createAdminClient().from("staff_schedules").select("*");
  return (data ?? []) as StaffScheduleRow[];
}

export async function getTimeOffInRange(startDate: string, endDate: string): Promise<StaffTimeOff[]> {
  const { data } = await createAdminClient()
    .from("staff_time_off")
    .select("*")
    .lte("start_date", endDate)
    .gte("end_date", startDate);
  return (data ?? []) as StaffTimeOff[];
}

/** For each staff id, return Set of YYYY-MM-DD dates they're unavailable in [startDate, endDate]. */
export async function getStaffUnavailableDatesMap(
  staffIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>(staffIds.map((id) => [id, new Set<string>()]));
  if (staffIds.length === 0) return result;

  // 1) Time off
  const { data: timeOff } = await createAdminClient()
    .from("staff_time_off")
    .select("staff_id, start_date, end_date")
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

  // 2) Days off via schedule (start_time/end_time NULL means explicitly not working)
  const { data: schedules } = await createAdminClient()
    .from("staff_schedules")
    .select("staff_id, day_of_week, start_time, end_time")
    .in("staff_id", staffIds);

  const offDays = new Map<string, Set<number>>(staffIds.map((id) => [id, new Set<number>()]));
  for (const s of schedules ?? []) {
    if (!s.start_time || !s.end_time) {
      offDays.get(s.staff_id as string)!.add(s.day_of_week as number);
    }
  }

  // Walk every date in range, mark offDays per staff
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
  await createAdminClient()
    .from("staff_schedules")
    .upsert({ staff_id: staffId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime }, { onConflict: "staff_id,day_of_week" });
}

/**
 * For a set of staff IDs and a specific date, return whether each is available
 * and what their working hours are (null = use business hours).
 * Checks both staff_schedules and staff_time_off.
 */
export async function getStaffAvailabilityMap(
  staffIds: string[],
  dateStr: string // YYYY-MM-DD
): Promise<Map<string, { available: boolean; startTime: string | null; endTime: string | null }>> {
  if (staffIds.length === 0) return new Map();

  // Day of week in Warsaw — use UTC date at noon to avoid DST issues
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();

  const [timeOffRes, scheduleRes] = await Promise.all([
    createAdminClient()
      .from("staff_time_off")
      .select("staff_id")
      .in("staff_id", staffIds)
      .lte("start_date", dateStr)
      .gte("end_date", dateStr),
    createAdminClient()
      .from("staff_schedules")
      .select("staff_id, start_time, end_time")
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
      // Has an explicit schedule for this day
      if (!sched.start_time || !sched.end_time) {
        // Explicitly not working
        result.set(id, { available: false, startTime: null, endTime: null });
      } else {
        result.set(id, {
          available: true,
          startTime: sched.start_time.slice(0, 5), // "HH:MM"
          endTime: sched.end_time.slice(0, 5),
        });
      }
    } else {
      // No schedule row → falls back to business hours
      result.set(id, { available: true, startTime: null, endTime: null });
    }
  }

  return result;
}
