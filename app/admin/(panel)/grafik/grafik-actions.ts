"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { upsertOneDaySchedule, addStaffTimeOff, deleteStaffTimeOff } from "@/lib/db/staff-schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";
import { warsawDayBoundsUtc } from "@/lib/slots";
import type { BookingForModal } from "@/components/booking-management-modal";

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

export type AddTimeOffState =
  | { status: "idle" }
  | { status: "ok"; conflicts: BookingForModal[] }
  | { status: "error"; message: string };

export async function addTimeOffFromGrafikAction(
  _prev: AddTimeOffState,
  formData: FormData
): Promise<AddTimeOffState> {
  await requireAdmin();
  const staffId = formData.get("staffId")?.toString();
  const startDate = formData.get("start_date")?.toString();
  const endDateRaw = formData.get("end_date")?.toString();
  const endDate = endDateRaw && endDateRaw.length > 0 ? endDateRaw : startDate;
  const type = (formData.get("type")?.toString() ?? "other") as "sick" | "vacation" | "personal" | "other";
  const note = formData.get("note")?.toString().trim() || null;

  if (!staffId || !startDate || !endDate) return { status: "error", message: "Brak danych" };
  if (endDate < startDate) return { status: "error", message: "Data końcowa wcześniej niż początkowa" };

  await addStaffTimeOff({ staff_id: staffId, start_date: startDate, end_date: endDate, type, note });

  // Find conflicting bookings for this staff in the date range.
  const startIso = warsawDayBoundsUtc(startDate).startIso;
  const endIso = warsawDayBoundsUtc(endDate).endIso;

  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("bookings")
    .select("*, service:services(name), staff:staff(name, color)")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId)
    .eq("status", "confirmed")
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at");

  type Row = {
    id: string; starts_at: string; ends_at: string; customer_name: string; customer_phone: string;
    notes: string | null; staff_id: string | null; service_id: string | null; status: "confirmed";
    service: { name: string } | null; staff: { name: string; color: string } | null;
  };
  const conflicts: BookingForModal[] = ((data ?? []) as unknown as Row[]).map((b) => ({
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    serviceId: b.service_id,
    serviceName: b.service?.name ?? null,
    staffId: b.staff_id,
    staffName: b.staff?.name ?? null,
    staffColor: b.staff?.color ?? null,
    notes: b.notes,
    status: b.status,
    paymentStatus: null,
  }));

  revalidatePath("/admin/grafik");
  revalidatePath("/admin/harmonogram");
  return { status: "ok", conflicts };
}

export async function deleteTimeOffFromGrafikAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await deleteStaffTimeOff(id);
  revalidatePath("/admin/grafik");
}
