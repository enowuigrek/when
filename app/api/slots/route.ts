import { NextResponse } from "next/server";
import { getServiceBySlug, getBusinessHours } from "@/lib/db/services";
import { getBookingsInRange } from "@/lib/db/bookings";
import { computeAvailableSlots, addDays } from "@/lib/slots";
import { getActiveStaff } from "@/lib/db/staff";
import { getStaffAvailabilityMap } from "@/lib/db/staff-schedule";
import { getSettings } from "@/lib/db/settings";
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceSlug = url.searchParams.get("service") ?? "";
  const dateStr = url.searchParams.get("date") ?? "";
  const staffId = url.searchParams.get("staff") || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ ok: false, message: "Niepoprawna data." }, { status: 400 });
  }

  const service = await getServiceBySlug(serviceSlug);
  if (!service) {
    return NextResponse.json({ ok: false, message: "Usługa nie istnieje." }, { status: 404 });
  }

  const [hours, settings, activeStaff] = await Promise.all([
    getBusinessHours(),
    getSettings(),
    getActiveStaff(),
  ]);

  const dayStartUtc = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const dayEndUtc = new Date(`${addDays(dateStr, 1)}T00:00:00Z`).toISOString();

  // Group class: capacity-based slots
  if (service.is_group && service.max_participants) {
    const existing = await getBookingsInRange(dayStartUtc, dayEndUtc, undefined, undefined);
    const slots = computeAvailableSlots(
      dateStr, service.duration_min, hours, existing,
      settings.slot_granularity_min, 1, true, service.max_participants
    );
    return NextResponse.json({ ok: true, slots });
  }

  const availMap = await getStaffAvailabilityMap(activeStaff.map((s) => s.id), dateStr);

  if (staffId) {
    const avail = availMap.get(staffId);
    if (avail && !avail.available) return NextResponse.json({ ok: true, slots: [] });
    const effectiveHours = applyStaffHours(hours, dateStr, avail ?? null);
    const existing = await getBookingsInRange(dayStartUtc, dayEndUtc, staffId);
    const slots = computeAvailableSlots(
      dateStr, service.duration_min, effectiveHours, existing,
      settings.slot_granularity_min, 1, true
    );
    return NextResponse.json({ ok: true, slots });
  }

  const availableStaff = activeStaff.filter((s) => availMap.get(s.id)?.available !== false);
  const staffCount = Math.max(1, availableStaff.length);
  const existing = await getBookingsInRange(dayStartUtc, dayEndUtc);
  const slots = computeAvailableSlots(
    dateStr, service.duration_min, hours, existing,
    settings.slot_granularity_min, staffCount, true
  );
  return NextResponse.json({ ok: true, slots });
}
