import { getServices, getBusinessHours } from "@/lib/db/services";
import { getSettings, getTimeFilters } from "@/lib/db/settings";
import { getBookingsInRange } from "@/lib/db/bookings";
import {
  computeAvailableSlots,
  warsawToday,
  addDays,
  formatShortDate,
  warsawDayOfWeek,
} from "@/lib/slots";
import { dayLabelsShort } from "@/lib/business";
import { AdminBookingForm } from "./admin-booking-form";

export const metadata = { title: "Nowa rezerwacja", robots: { index: false } };

export default async function AdminNewBookingPage() {
  const [services, hours, settings, timeFilters] = await Promise.all([
    getServices(),
    getBusinessHours(),
    getSettings(),
    getTimeFilters(),
  ]);

  const firstService = services[0] ?? null;
  const today = warsawToday();

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

  const initialDate = days.find((d) => !d.closed)?.date ?? today;

  // Pre-compute initial slots server-side.
  let initialSlots: ReturnType<typeof computeAvailableSlots> = [];
  if (firstService) {
    const dayStartUtc = new Date(`${initialDate}T00:00:00Z`).toISOString();
    const dayEndUtc = new Date(`${addDays(initialDate, 1)}T00:00:00Z`).toISOString();
    const existing = await getBookingsInRange(dayStartUtc, dayEndUtc);
    initialSlots = computeAvailableSlots(
      initialDate,
      firstService.duration_min,
      hours,
      existing,
      settings.slot_granularity_min
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Nowa rezerwacja</h1>
      <p className="text-sm text-zinc-500 mb-8">Rezerwacja przez telefon lub wizytę osobistą.</p>
      <AdminBookingForm
        services={services}
        days={days}
        initialDate={initialDate}
        initialSlots={initialSlots}
        timeFilters={timeFilters}
        granularityMin={settings.slot_granularity_min}
      />
    </section>
  );
}
