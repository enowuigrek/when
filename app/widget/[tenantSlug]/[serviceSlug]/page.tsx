import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenantIdBySlug } from "@/lib/tenant";
import {
  getServiceBySlugForTenant,
  getBusinessHoursForTenant,
  getActiveStaffForTenant,
  getSettingsForTenant,
  getTimeFiltersForTenant,
  getBookingsInRangeForTenant,
  getStaffUnavailableDatesMapForTenant,
} from "@/lib/db/for-tenant";
import { WidgetBookingFlow } from "./widget-booking-flow";
import { getWidgetSlots } from "./actions";
import { warsawToday, addDays, warsawDayOfWeek } from "@/lib/slots";

type Props = { params: Promise<{ tenantSlug: string; serviceSlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { tenantSlug, serviceSlug } = await params;
  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) return { title: "Rezerwacja" };
  const [service, settings] = await Promise.all([
    getServiceBySlugForTenant(serviceSlug, tenantId),
    getSettingsForTenant(tenantId),
  ]);
  return {
    title: service ? `${service.name} — ${settings.business_name}` : "Rezerwacja",
    robots: { index: false },
  };
}

export default async function WidgetServicePage({ params }: Props) {
  const { tenantSlug, serviceSlug } = await params;
  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) notFound();

  const [service, settings, hours, activeStaff, timeFilters] = await Promise.all([
    getServiceBySlugForTenant(serviceSlug, tenantId),
    getSettingsForTenant(tenantId),
    getBusinessHoursForTenant(tenantId),
    getActiveStaffForTenant(tenantId),
    getTimeFiltersForTenant(tenantId),
  ]);

  if (!service) notFound();

  const accent = settings.color_accent ?? "#d4a26a";
  const today = warsawToday();
  const horizonEnd = addDays(today, settings.booking_horizon_days ?? 21);

  // Build calendar days
  const days: { date: string; closed: boolean }[] = [];
  for (let i = 0; i < (settings.booking_horizon_days ?? 21); i++) {
    const date = addDays(today, i);
    const dow = warsawDayOfWeek(date);
    const hour = hours.find((h) => h.day_of_week === dow);
    days.push({ date, closed: hour?.closed ?? false });
  }

  const initialDate = days.find((d) => !d.closed)?.date ?? today;

  // Initial slots for first open day
  const initialSlotsRes = await getWidgetSlots(tenantSlug, serviceSlug, initialDate, null);
  const initialSlots = initialSlotsRes.ok ? initialSlotsRes.slots : [];

  // Staff unavailable dates for calendar highlighting
  const staffIds = activeStaff.map((s) => s.id);
  const unavailableMap = await getStaffUnavailableDatesMapForTenant(staffIds, today, horizonEnd, tenantId);
  const staffUnavailable = Object.fromEntries([...unavailableMap.entries()]);

  const staffOptions = activeStaff.map((s) => ({ id: s.id, name: s.name, color: s.color }));

  return (
    <div
      className="px-4 py-5 sm:px-6"
      style={{ "--color-accent": accent, "--color-accent-hover": accent } as React.CSSProperties}
    >
      {/* Back + service header */}
      <div className="mb-5">
        <Link
          href={`/widget/${tenantSlug}`}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Wróć
        </Link>
        <h1 className="text-lg font-semibold text-zinc-100">{service.name}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm">
          <span className="font-mono text-[var(--color-accent)]">{service.price_pln} zł</span>
          <span className="text-zinc-500">{service.duration_min} min</span>
        </div>
        {service.description && (
          <p className="mt-1.5 text-sm text-zinc-400">{service.description}</p>
        )}
      </div>

      <WidgetBookingFlow
        tenantSlug={tenantSlug}
        serviceSlug={serviceSlug}
        days={days}
        initialDate={initialDate}
        initialSlots={initialSlots}
        timeFilters={timeFilters}
        today={today}
        staff={staffOptions}
        staffUnavailable={staffUnavailable}
      />

      <p className="mt-6 text-center text-[10px] text-zinc-700">
        Rezerwacje przez{" "}
        <a href="https://when-three.vercel.app/start" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-500">
          WHEN?
        </a>
      </p>
    </div>
  );
}
