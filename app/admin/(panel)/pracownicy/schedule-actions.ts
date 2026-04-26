"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { upsertStaffSchedule, addStaffTimeOff, deleteStaffTimeOff } from "@/lib/db/staff-schedule";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

export type ScheduleState = { status: "idle" } | { status: "ok" } | { status: "error"; message: string };

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export async function saveStaffScheduleAction(
  _prev: ScheduleState,
  formData: FormData
): Promise<ScheduleState> {
  await requireAdmin();
  const staffId = formData.get("staffId")?.toString();
  if (!staffId) return { status: "error", message: "Brak ID pracownika." };

  const rows = DAYS.map((dow) => {
    const working = formData.get(`working_${dow}`) === "1";
    const start = formData.get(`start_${dow}`)?.toString() || null;
    const end = formData.get(`end_${dow}`)?.toString() || null;
    return {
      day_of_week: dow,
      start_time: working && start ? start : null,
      end_time: working && end ? end : null,
    };
  });

  try {
    await upsertStaffSchedule(staffId, rows);
  } catch (e) {
    return { status: "error", message: String(e) };
  }

  revalidatePath(`/admin/pracownicy/${staffId}`);
  return { status: "ok" };
}

export type TimeOffState = { status: "idle" } | { status: "ok" } | { status: "error"; message: string };

export async function addTimeOffAction(
  _prev: TimeOffState,
  formData: FormData
): Promise<TimeOffState> {
  await requireAdmin();
  const staffId = formData.get("staffId")?.toString();
  const startDate = formData.get("start_date")?.toString();
  const endDate = formData.get("end_date")?.toString();
  const type = (formData.get("type")?.toString() ?? "other") as "sick" | "vacation" | "personal" | "other";
  const note = formData.get("note")?.toString().trim() || null;

  if (!staffId || !startDate || !endDate) return { status: "error", message: "Uzupełnij daty." };
  if (endDate < startDate) return { status: "error", message: "Data końcowa musi być ≥ startowej." };

  try {
    await addStaffTimeOff({ staff_id: staffId, start_date: startDate, end_date: endDate, type, note });
  } catch (e) {
    return { status: "error", message: String(e) };
  }

  revalidatePath(`/admin/pracownicy/${staffId}`);
  return { status: "ok" };
}

export async function deleteTimeOffAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  const staffId = formData.get("staffId")?.toString();
  if (!id || !staffId) throw new Error("Missing params");
  await deleteStaffTimeOff(id);
  revalidatePath(`/admin/pracownicy/${staffId}`);
}
