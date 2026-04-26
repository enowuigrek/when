"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { getServiceById, getBusinessHours } from "@/lib/db/services";
import { getBookingsInRange, createBooking, getBusyStaffIds } from "@/lib/db/bookings";
import { getSettings } from "@/lib/db/settings";
import { computeAvailableSlots, addDays } from "@/lib/slots";
import { getActiveStaff } from "@/lib/db/staff";
import { getStaffAvailabilityMap } from "@/lib/db/staff-schedule";
import { searchCustomersByPhone, upsertCustomer } from "@/lib/db/customers";
import type { Slot } from "@/lib/slots";
import type { BusinessHours } from "@/lib/types";

function applyStaffHours(
  hours: BusinessHours[],
  dateStr: string,
  avail: { startTime: string | null; endTime: string | null } | null
): BusinessHours[] {
  if (!avail?.startTime || !avail?.endTime) return hours;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return hours.map((h) =>
    h.day_of_week === dayOfWeek
      ? { ...h, open_time: avail.startTime! + ":00", close_time: avail.endTime! + ":00", closed: false }
      : h
  );
}

export async function searchCustomersAction(query: string) {
  return searchCustomersByPhone(query);
}

export async function getAdminSlotsForDate(
  serviceId: string,
  dateStr: string,
  staffId?: string
): Promise<{ ok: true; slots: Slot[] } | { ok: false; message: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { ok: false, message: "Niepoprawna data." };
  }

  const [service, hours, settings, activeStaff] = await Promise.all([
    getServiceById(serviceId),
    getBusinessHours(),
    getSettings(),
    getActiveStaff(),
  ]);

  if (!service) return { ok: false, message: "Usługa nie istnieje." };

  const dayStartUtc = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const dayEndUtc = new Date(`${addDays(dateStr, 1)}T00:00:00Z`).toISOString();

  const availMap = await getStaffAvailabilityMap(activeStaff.map((s) => s.id), dateStr);

  if (staffId) {
    const avail = availMap.get(staffId);
    if (avail && !avail.available) return { ok: true, slots: [] };
    const effectiveHours = applyStaffHours(hours, dateStr, avail ?? null);
    const existing = await getBookingsInRange(dayStartUtc, dayEndUtc, staffId);
    const slots = computeAvailableSlots(dateStr, service.duration_min, effectiveHours, existing, settings.slot_granularity_min, 1);
    return { ok: true, slots };
  }

  const availableStaff = activeStaff.filter((s) => availMap.get(s.id)?.available !== false);
  const staffCount = Math.max(1, availableStaff.length);
  const existing = await getBookingsInRange(dayStartUtc, dayEndUtc);
  const slots = computeAvailableSlots(dateStr, service.duration_min, hours, existing, settings.slot_granularity_min, staffCount);
  return { ok: true, slots };
}

const schema = z.object({
  serviceId: z.string().uuid("Wybierz usługę"),
  startsAtIso: z.string().datetime("Wybierz termin"),
  customerName: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  customerPhone: z.string().trim().min(7, "Numer za krótki").max(30),
  customerEmail: z
    .string()
    .trim()
    .email("Niepoprawny email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(500).optional(),
  staffId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export type AdminBookingState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function createAdminBookingAction(
  _prev: AdminBookingState,
  formData: FormData
): Promise<AdminBookingState> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const raw = {
    serviceId: formData.get("serviceId")?.toString() ?? "",
    startsAtIso: formData.get("startsAtIso")?.toString() ?? "",
    customerName: formData.get("customerName")?.toString() ?? "",
    customerPhone: formData.get("customerPhone")?.toString() ?? "",
    customerEmail: formData.get("customerEmail")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
    staffId: formData.get("staffId")?.toString() ?? "",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź formularz.", fieldErrors };
  }

  const service = await getServiceById(parsed.data.serviceId);
  if (!service) return { status: "error", message: "Usługa nie istnieje." };

  const startsAt = new Date(parsed.data.startsAtIso);
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);

  let resolvedStaffId: string | null = parsed.data.staffId ?? null;
  if (!resolvedStaffId) {
    const [busyIds, allStaff] = await Promise.all([
      getBusyStaffIds(startsAt.toISOString(), endsAt.toISOString()),
      getActiveStaff(),
    ]);
    const free = allStaff.filter((s) => !busyIds.includes(s.id));
    resolvedStaffId = free[0]?.id ?? null;
  }

  const result = await createBooking({
    serviceId: service.id,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    customerEmail: parsed.data.customerEmail ?? null,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: endsAt.toISOString(),
    notes: parsed.data.notes ?? null,
    staffId: resolvedStaffId,
  });

  if (!result.ok) return { status: "error", message: result.message };

  try {
    await upsertCustomer({
      phone: parsed.data.customerPhone,
      name: parsed.data.customerName,
      email: parsed.data.customerEmail ?? null,
    });
  } catch {
  }

  revalidatePath("/admin/harmonogram");
  redirect("/admin/harmonogram");
}
