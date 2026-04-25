import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { verifyBookingToken } from "@/lib/booking-token";
import { getBookingById } from "@/lib/db/bookings";
import { getBusinessHours } from "@/lib/db/services";
import { getActiveStaff } from "@/lib/db/staff";
import { getSettings, getTimeFilters } from "@/lib/db/settings";
import {
  computeAvailableSlots,
  warsawToday,
  addDays,
  warsawDayOfWeek,
  formatWarsawDate,
  formatWarsawTime,
} from "@/lib/slots";
import { RescheduleFlow } from "./reschedule-flow";

export const metadata = { title: "Zmień termin", robots: { index: false } };

type Params = Promise<{ token: string }>;

export default async function ReschedulePage({ params }: { params: Params }) {
  const { token } = await params;
  const bookingId = verifyBookingToken(token, "reschedule");
  if (!bookingId) notFound();

  const booking = await getBookingById(bookingId);
  if (!booking || booking.status !== "confirmed") notFound();

  const service = (
    booking as { service?: { name: string; slug: string; duration_min: number; price_pln: number } }
  ).service;
  if (!service) notFound();

  const [hours, settings, timeFilters, activeStaff] = await Promise.all([
    getBusinessHours(),
    getSettings(),
    getTimeFilters(),
    getActiveStaff(),
  ]);

  const today = warsawToday();
  const days = Array.from({ length: settings.booking_horizon_days }, (_, i) => {
    const date = addDays(today, i);
    const dow = warsawDayOfWeek(date);
    const dayHours = hours.find((h) => h.day_of_week === dow);
    return { date, closed: !dayHours || dayHours.closed };
  });

  const initialDate = days.find((d) => !d.closed)?.date ?? today;
  const dayStartUtc = new Date(`${initialDate}T00:00:00Z`).toISOString();
  const dayEndUtc = new Date(`${addDays(initialDate, 1)}T00:00:00Z`).toISOString();

  const { getBookingsInRange } = await import("@/lib/db/bookings");
  const existing = await getBookingsInRange(dayStartUtc, dayEndUtc);
  const staffCount = Math.max(1, activeStaff.length);
  const initialSlots = computeAvailableSlots(
    initialDate,
    service.duration_min,
    hours,
    existing,
    settings.slot_granularity_min,
    staffCount,
    true
  );

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-2xl font-semibold tracking-tight">Zmiana terminu</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Obecny termin:{" "}
            <span className="text-zinc-200">
              {formatWarsawDate(booking.starts_at)}, godz.{" "}
              {formatWarsawTime(booking.starts_at)}
            </span>
          </p>

          <div className="mt-4 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 text-sm text-zinc-400">
            <span className="text-zinc-300">{service.name}</span> · {booking.customer_name}
          </div>

          <RescheduleFlow
            token={token}
            serviceSlug={service.slug}
            days={days}
            initialDate={initialDate}
            initialSlots={initialSlots}
            timeFilters={timeFilters}
            today={today}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
