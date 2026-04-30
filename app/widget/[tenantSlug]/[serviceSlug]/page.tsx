import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getTenantIdBySlug } from "@/lib/tenant";
import {
  getServiceBySlugForTenant,
  getBusinessHoursForTenant,
  getActiveStaffForTenant,
  getSettingsForTenant,
  getTimeFiltersForTenant,
  getStaffUnavailableDatesMapForTenant,
} from "@/lib/db/for-tenant";
import { WidgetHeader } from "@/components/widget-header";
import { SiteFooter } from "@/components/site-footer";
import { WidgetBookingFlow } from "./widget-booking-flow";
import { getWidgetSlots } from "./actions";
import { warsawToday, addDays, warsawDayOfWeek } from "@/lib/slots";

type Props = {
  params: Promise<{ tenantSlug: string; serviceSlug: string }>;
  searchParams: Promise<{ embed?: string }>;
};

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

export default async function WidgetServicePage({ params, searchParams }: Props) {
  const { tenantSlug, serviceSlug } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1";
  const hdrs = await headers();
  const isSubdomain = !!hdrs.get("x-tenant-subdomain");
  const basePath = isSubdomain ? "" : `/widget/${tenantSlug}`;
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
      className="flex min-h-screen flex-col"
      style={{ "--color-accent": accent, "--color-accent-hover": accent } as React.CSSProperties}
    >
      <WidgetHeader settings={settings} tenantSlug={tenantSlug} />

      <main className="flex-1">
        <section className={`mx-auto max-w-3xl px-6 ${isEmbed ? "py-8" : "py-12 md:py-16"}`}>
          {/* Stepper — same UX as /rezerwacja flow */}
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <Link href={`${basePath || "/"}${isEmbed ? "?embed=1" : ""}`} className="hover:text-zinc-300">
              <span className="font-mono">01</span> Usługa
            </Link>
            <span className="text-zinc-700">→</span>
            <span className="text-zinc-200">
              <span className="font-mono text-[var(--color-accent)]">02</span> Termin
            </span>
            <span className="text-zinc-700">→</span>
            <span>Dane</span>
          </div>

          {/* Service summary card */}
          <div className="mt-6 flex items-start justify-between gap-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{service.name}</h1>
              {service.description && (
                <p className="mt-1 text-sm text-zinc-400">{service.description}</p>
              )}
              <p className="mt-2 font-mono text-xs uppercase tracking-wider text-zinc-500">
                {service.duration_min} min
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-xl font-semibold" style={{ color: accent }}>
                {service.price_pln} zł
              </div>
              <Link
                href={`${basePath || "/"}${isEmbed ? "?embed=1" : ""}`}
                className="mt-1 inline-block text-xs text-zinc-500 hover:text-zinc-300"
              >
                Zmień
              </Link>
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
            isEmbed={isEmbed}
          />
        </section>
      </main>

      {!isEmbed && <SiteFooter />}
    </div>
  );
}
