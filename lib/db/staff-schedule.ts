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
