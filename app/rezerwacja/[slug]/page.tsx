import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getServiceBySlug, getBusinessHours } from "@/lib/db/services";
import { getBookingsInRange } from "@/lib/db/bookings";
import {
  computeAvailableSlots,
  warsawToday,
  addDays,
  formatShortDate,
  warsawDayOfWeek,
} from "@/lib/slots";
import { dayLabelsShort } from "@/lib/business";
import { getSettings } from "@/lib/db/settings";
import { BookingFlow } from "./booking-flow";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  return {
    title: service ? `Rezerwacja — ${service.name}` : "Rezerwacja",
  };
}

export default async function BookingServicePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const [hours, settings] = await Promise.all([getBusinessHours(), getSettings()]);
  const today = warsawToday();

  // Pre-build the day strip for the next N days.
  const days = Array.from({ length: settings.booking_horizon_days }, (_, i) => {
    const date = addDays(today, i);
    const dow = warsawDayOfWeek(date);
    const dayHours = hours.find((h) => h.day_of_week === dow);
    return {
      date,
      dow,
      dayLabel: dayLabelsShort[dow],
      dayNum: Number(date.split("-")[2]),
      shortDate: formatShortDate(date),
      closed: !dayHours || dayHours.closed,
    };
  });

  // Find first non-closed day for the initial selection.
  const initialDate = days.find((d) => !d.closed)?.date ?? today;

  // Compute initial slots server-side so SSR is meaningful.
  const dayStartUtc = new Date(`${initialDate}T00:00:00Z`).toISOString();
  const dayEndUtc = new Date(`${addDays(initialDate, 1)}T00:00:00Z`).toISOString();
  const existing = await getBookingsInRange(dayStartUtc, dayEndUtc);
  const initialSlots = computeAvailableSlots(
    initialDate,
    service.duration_min,
    hours,
    existing,
    settings.slot_granularity_min
  );

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
          {/* Stepper */}
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
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
          <div className="mt-6 flex items-start justify-between gap-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {service.name}
              </h1>
              {service.description && (
                <p className="mt-1 text-sm text-zinc-400">{service.description}</p>
              )}
              <p className="mt-2 font-mono text-xs uppercase tracking-wider text-zinc-500">
                {service.duration_min} min
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-xl font-semibold text-[var(--color-accent)]">
                {service.price_pln} zł
              </div>
              <Link
                href="/rezerwacja"
                className="mt-1 inline-block text-xs text-zinc-500 hover:text-zinc-300"
              >
                Zmień
              </Link>
            </div>
          </div>

          <BookingFlow
            serviceSlug={service.slug}
            days={days}
            initialDate={initialDate}
            initialSlots={initialSlots}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
