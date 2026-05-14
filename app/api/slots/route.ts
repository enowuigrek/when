import { NextResponse } from "next/server";
import { computeAvailableSlots, addDays, applyStaffHours } from "@/lib/slots";
import { MAIN_TENANT_ID } from "@/lib/tenant";
import {
  getServiceBySlugForTenant,
  getBusinessHoursForTenant,
  getActiveStaffForTenant,
  getSettingsForTenant,
  getBookingsInRangeForTenant,
  getStaffAvailabilityMapForTenant,
} from "@/lib/db/for-tenant";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceSlug = url.searchParams.get("service") ?? "";
  const dateStr = url.searchParams.get("date") ?? "";
  const staffId = url.searchParams.get("staff") || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ ok: false, message: "Niepoprawna data." }, { status: 400 });
  }

  const service = await getServiceBySlugForTenant(serviceSlug, MAIN_TENANT_ID);
  if (!service) {
    return NextResponse.json({ ok: false, message: "Usługa nie istnieje." }, { status: 404 });
  }

  const [hours, settings, activeStaff] = await Promise.all([
    getBusinessHoursForTenant(MAIN_TENANT_ID),
    getSettingsForTenant(MAIN_TENANT_ID),
    getActiveStaffForTenant(MAIN_TENANT_ID),
  ]);

  const dayStartUtc = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const dayEndUtc = new Date(`${addDays(dateStr, 1)}T00:00:00Z`).toISOString();

  // Group class: capacity-based slots
  if (service.is_group && service.max_participants) {
    const existing = await getBookingsInRangeForTenant(dayStartUtc, dayEndUtc, MAIN_TENANT_ID);
    const slots = computeAvailableSlots(
      dateStr, service.duration_min, hours, existing,
      settings.slot_granularity_min, 1, true, service.max_participants
    );
    return NextResponse.json({ ok: true, slots });
  }

  const availMap = await getStaffAvailabilityMapForTenant(
    activeStaff.map((s) => s.id),
    dateStr,
    MAIN_TENANT_ID
  );

  if (staffId) {
    const avail = availMap.get(staffId);
    if (avail && !avail.available) return NextResponse.json({ ok: true, slots: [] });
    const effectiveHours = applyStaffHours(hours, dateStr, avail ?? null);
    const existing = await getBookingsInRangeForTenant(dayStartUtc, dayEndUtc, MAIN_TENANT_ID, staffId);
    const slots = computeAvailableSlots(
      dateStr, service.duration_min, effectiveHours, existing,
      settings.slot_granularity_min, 1, true
    );
    return NextResponse.json({ ok: true, slots });
  }

  const availableStaff = activeStaff.filter((s) => availMap.get(s.id)?.available !== false);
  const staffCount = Math.max(1, availableStaff.length);
  const existing = await getBookingsInRangeForTenant(dayStartUtc, dayEndUtc, MAIN_TENANT_ID);
  const slots = computeAvailableSlots(
    dateStr, service.duration_min, hours, existing,
    settings.slot_granularity_min, staffCount, true
  );
  return NextResponse.json({ ok: true, slots });
}
