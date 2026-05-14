import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { warsawToday, addDays, warsawDayOfWeek } from "@/lib/slots";
import { MAIN_TENANT_ID } from "@/lib/tenant";
import {
  getMainActiveStaff,
  getMainBusinessHours,
  getMainServiceBySlug,
  getMainSettings,
  getMainTimeFilters,
} from "@/lib/db/main-tenant";
import { getStaffUnavailableDatesMapForTenant } from "@/lib/db/for-tenant";
import { BookingFlow } from "./booking-flow";
import { getSlotsForDate } from "./actions";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const service = await getMainServiceBySlug(slug);
  return {
    title: service ? `Rezerwacja — ${service.name}` : "Rezerwacja",
  };
}

export default async function BookingServicePage({ params }: { params: Params }) {
  const { slug } = await params;
  const service = await getMainServiceBySlug(slug);
  if (!service) notFound();

  const [hours, settings, timeFilters, activeStaff] = await Promise.all([
    getMainBusinessHours(),
    getMainSettings(),
    getMainTimeFilters(),
    getMainActiveStaff(),
  ]);

  const today = warsawToday();

  const days = Array.from({ length: settings.booking_horizon_days }, (_, i) => {
    const date = addDays(today, i);
    const dow = warsawDayOfWeek(date);
    const dayHours = hours.find((h) => h.day_of_week === dow);
    return { date, closed: !dayHours || dayHours.closed };
  });

  const lastDate = days[days.length - 1]?.date ?? today;
  const unavailableMap = await getStaffUnavailableDatesMapForTenant(
    activeStaff.map((s) => s.id),
    today,
    lastDate,
    MAIN_TENANT_ID
  );
  const staffUnavailable: Record<string, string[]> = {};
  for (const [sid, dates] of unavailableMap) staffUnavailable[sid] = dates;

  const initialDate = days.find((d) => !d.closed)?.date ?? today;
  const initialStaffId = !service.is_group && activeStaff.length === 1 ? activeStaff[0].id : null;
  const initialSlotsRes = await getSlotsForDate(service.slug, initialDate, initialStaffId);
  const initialSlots = initialSlotsRes.ok ? initialSlotsRes.slots : [];

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
          {/* Stepper */}
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
            <Link href="/rezerwacja" className="hover:text-zinc-300">
              <span className="font-mono">01</span> Usługa
            </Link>
            <span className="text-zinc-700">→</span>
            <span className="text-zinc-200">
              <span className="font-mono text-[var(--color-accent)]">02</span> Termin
            </span>
            <span className="text-zinc-700">→</span>
            <span>Dane</span>
          </div>

          {/* Service summary */}
          <div className="mt-6 flex items-start justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 sm:gap-6 sm:p-5">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{service.name}</h1>
              {service.description && (
                <p className="mt-1 text-sm text-zinc-400">{service.description}</p>
              )}
              <p className="mt-2 font-mono text-xs uppercase tracking-wider text-zinc-500">
                {service.duration_min} min
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="whitespace-nowrap font-mono text-lg font-semibold text-[var(--color-accent)] sm:text-xl">
                {service.price_pln} zł
              </div>
              <Link href="/rezerwacja" className="mt-1 inline-block text-xs text-zinc-500 hover:text-zinc-300">
                Zmień
              </Link>
            </div>
          </div>

          <BookingFlow
            serviceSlug={service.slug}
            days={days}
            initialDate={initialDate}
            initialSlots={initialSlots}
            timeFilters={timeFilters}
            today={today}
            staff={activeStaff.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
            staffUnavailable={staffUnavailable}
            isGroup={service.is_group}
            initialStaffId={initialStaffId}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
