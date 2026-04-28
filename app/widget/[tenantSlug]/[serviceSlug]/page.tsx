import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenantIdBySlug } from "@/lib/tenant";
import {
  getServiceBySlugForTenant,
  getBusinessHoursForTenant,
  getActiveStaffForTenant,
  getSettingsForTenant,
  getTimeFiltersForTenant,
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

  const days: { date: string; closed: boolean }[] = [];
  for (let i = 0; i < (settings.booking_horizon_days ?? 21); i++) {
    const date = addDays(today, i);
    const dow = warsawDayOfWeek(date);
    const hour = hours.find((h) => h.day_of_week === dow);
    days.push({ date, closed: hour?.closed ?? false });
  }

  const initialDate = days.find((d) => !d.closed)?.date ?? today;
  const initialSlotsRes = await getWidgetSlots(tenantSlug, serviceSlug, initialDate, null);
  const initialSlots = initialSlotsRes.ok ? initialSlotsRes.slots : [];

  const staffIds = activeStaff.map((s) => s.id);
  const unavailableMap = await getStaffUnavailableDatesMapForTenant(staffIds, today, horizonEnd, tenantId);
  const staffUnavailable = Object.fromEntries([...unavailableMap.entries()]);
  const staffOptions = activeStaff.map((s) => ({ id: s.id, name: s.name, color: s.color }));

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ "--color-accent": accent, "--color-accent-hover": accent } as React.CSSProperties}
    >
      <div className="mx-auto w-full max-w-sm">

        {/* Back + service header */}
        <div className="mb-5">
          <Link
            href={`/widget/${tenantSlug}`}
            className="mb-4 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← {settings.business_name}
          </Link>

          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3.5">
            <h1 className="font-semibold text-zinc-100">{service.name}</h1>
            <div className="mt-1.5 flex items-center gap-3 text-sm">
              <span className="font-mono font-semibold" style={{ color: accent }}>{service.price_pln} zł</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">{service.duration_min} min</span>
            </div>
            {service.description && (
              <p className="mt-1.5 text-xs text-zinc-500">{service.description}</p>
            )}
          </div>
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
          <a href="https://whenbooking.pl" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-500">
            when
          </a>
        </p>
      </div>
    </div>
  );
}
