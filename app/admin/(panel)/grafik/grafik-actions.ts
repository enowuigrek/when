"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { upsertOneDaySchedule, addStaffTimeOff, deleteStaffTimeOff } from "@/lib/db/staff-schedule";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

export async function updateDayScheduleAction(formData: FormData) {
  await requireAdmin();
  const staffId = formData.get("staffId")?.toString();
  const dow = Number(formData.get("dow"));
  const working = formData.get("working") === "1";
  const start = formData.get("start")?.toString() || null;
  const end = formData.get("end")?.toString() || null;

  if (!staffId) return;
  await upsertOneDaySchedule(staffId, dow, working && start ? start : null, working && end ? end : null);
  revalidatePath("/admin/grafik");
}

export async function addTimeOffFromGrafikAction(formData: FormData) {
  await requireAdmin();
  const staffId = formData.get("staffId")?.toString();
  const startDate = formData.get("start_date")?.toString();
  const endDateRaw = formData.get("end_date")?.toString();
  const endDate = endDateRaw && endDateRaw.length > 0 ? endDateRaw : startDate;
  const type = (formData.get("type")?.toString() ?? "other") as "sick" | "vacation" | "personal" | "other";
  const note = formData.get("note")?.toString().trim() || null;

  if (!staffId || !startDate || !endDate) return;
  if (endDate < startDate) return;

  await addStaffTimeOff({ staff_id: staffId, start_date: startDate, end_date: endDate, type, note });
  revalidatePath("/admin/grafik");
}

export async function deleteTimeOffFromGrafikAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await deleteStaffTimeOff(id);
  revalidatePath("/admin/grafik");
}
