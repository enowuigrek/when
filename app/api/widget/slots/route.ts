import { NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/tenant";
import {
  getServiceBySlugForTenant,
  getBusinessHoursForTenant,
  getActiveStaffForTenant,
  getSettingsForTenant,
  getBookingsInRangeForTenant,
  getStaffAvailabilityMapForTenant,
} from "@/lib/db/for-tenant";
import { computeAvailableSlots, addDays, applyStaffHours } from "@/lib/slots";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenantSlug = url.searchParams.get("tenant") ?? "";
  const serviceSlug = url.searchParams.get("service") ?? "";
  const dateStr = url.searchParams.get("date") ?? "";
  const staffId = url.searchParams.get("staff") || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ ok: false, message: "Niepoprawna data." }, { status: 400 });
  }

  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) return NextResponse.json({ ok: false, message: "Nieznany salon." }, { status: 404 });

  const service = await getServiceBySlugForTenant(serviceSlug, tenantId);
  if (!service) return NextResponse.json({ ok: false, message: "Usługa nie istnieje." }, { status: 404 });

  const [hours, settings, activeStaff] = await Promise.all([
    getBusinessHoursForTenant(tenantId),
    getSettingsForTenant(tenantId),
    getActiveStaffForTenant(tenantId),
  ]);

  const dayStart = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const dayEnd = new Date(`${addDays(dateStr, 1)}T00:00:00Z`).toISOString();

  if (service.is_group && service.max_participants) {
    const existing = await getBookingsInRangeForTenant(dayStart, dayEnd, tenantId);
    const slots = computeAvailableSlots(
      dateStr, service.duration_min, hours, existing,
      settings.slot_granularity_min, 1, true, service.max_participants
    );
    return NextResponse.json({ ok: true, slots });
  }

  const availMap = await getStaffAvailabilityMapForTenant(activeStaff.map((s) => s.id), dateStr, tenantId);

  if (staffId) {
    const avail = availMap.get(staffId);
    if (avail && !avail.available) return NextResponse.json({ ok: true, slots: [] });
    const effectiveHours = applyStaffHours(hours, dateStr, avail ?? null);
    const existing = await getBookingsInRangeForTenant(dayStart, dayEnd, tenantId, staffId);
    const slots = computeAvailableSlots(
      dateStr, service.duration_min, effectiveHours, existing,
      settings.slot_granularity_min, 1, true
    );
    return NextResponse.json({ ok: true, slots });
  }

  const availableStaff = activeStaff.filter((s) => availMap.get(s.id)?.available !== false);
  const staffCount = Math.max(1, availableStaff.length);
  const existing = await getBookingsInRangeForTenant(dayStart, dayEnd, tenantId);
  const slots = computeAvailableSlots(
    dateStr, service.duration_min, hours, existing,
    settings.slot_granularity_min, staffCount, true
  );
  return NextResponse.json({ ok: true, slots });
}
