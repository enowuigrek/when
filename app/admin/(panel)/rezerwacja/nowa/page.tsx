import { getServices, getBusinessHours } from "@/lib/db/services";
import { getSettings, getTimeFilters } from "@/lib/db/settings";
import { getBookingsInRange } from "@/lib/db/bookings";
import { computeAvailableSlots, warsawToday, addDays, warsawDayOfWeek } from "@/lib/slots";
import { getAllStaff } from "@/lib/db/staff";
import { AdminBookingForm } from "./admin-booking-form";

export const metadata = { title: "Nowa rezerwacja", robots: { index: false } };

export default async function AdminNewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; godzina?: string; phone?: string; name?: string; email?: string }>;
}) {
  const { data: dataParam, godzina: godzinaParam, phone, name, email } = await searchParams;

  const [services, hours, settings, timeFilters, allStaff] = await Promise.all([
    getServices(),
    getBusinessHours(),
    getSettings(),
    getTimeFilters(),
    getAllStaff(),
  ]);

  const activeStaff = allStaff.filter((s) => s.active);
  const staffCount = Math.max(1, activeStaff.length);
  const firstService = services[0] ?? null;
  const today = warsawToday();

  const days = Array.from({ length: settings.booking_horizon_days }, (_, i) => {
    const date = addDays(today, i);
    const dow = warsawDayOfWeek(date);
    const dayHours = hours.find((h) => h.day_of_week === dow);
    return { date, closed: !dayHours || dayHours.closed };
  });

  const prefilledDate = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? dataParam : null;
  const initialDate = prefilledDate ?? days.find((d) => !d.closed)?.date ?? today;

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
      settings.slot_granularity_min,
      staffCount
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Nowa rezerwacja</h1>
      <p className="text-sm text-zinc-500 mb-8">Rezerwacja przez telefon lub wizytę osobistą.</p>
      <AdminBookingForm
        services={services}
        staff={activeStaff}
        days={days}
        initialDate={initialDate}
        initialSlots={initialSlots}
        timeFilters={timeFilters}
        granularityMin={settings.slot_granularity_min}
        today={today}
        prefilledTime={godzinaParam ?? null}
        prefilledPhone={phone ?? null}
        prefilledName={name ?? null}
        prefilledEmail={email ?? null}
      />
    </section>
  );
}
