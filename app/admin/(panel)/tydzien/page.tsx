import { getBookingsBetween } from "@/lib/db/bookings";
import { getActiveStaff } from "@/lib/db/staff";
import {
  warsawToday,
  addDays,
  warsawDayBoundsUtc,
  warsawDayOfWeek,
  formatShortDate,
} from "@/lib/slots";
import { BookingRow } from "../booking-row";
import { dayLabels } from "@/lib/business";

export const metadata = {
  title: "Tydzień",
  robots: { index: false },
};

export default async function WeekPage() {
  const today = warsawToday();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  // Single query covering the whole week.
  const startIso = warsawDayBoundsUtc(days[0]).startIso;
  const endIso = warsawDayBoundsUtc(days[6]).endIso;
  const [all, allStaff] = await Promise.all([
    getBookingsBetween(startIso, endIso),
    getActiveStaff(),
  ]);
  const active = all.filter((b) => b.status !== "cancelled" && b.status !== "no_show");

  // Group by Warsaw-local day.
  const byDay = new Map<string, typeof active>();
  for (const b of active) {
    const dateStr = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(b.starts_at));
    const arr = byDay.get(dateStr) ?? [];
    arr.push(b);
    byDay.set(dateStr, arr);
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Tydzień</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Najbliższe 7 dni · {active.length} rezerwacji
      </p>

      <div className="mt-8 space-y-8">
        {days.map((d) => {
          const dayBookings = byDay.get(d) ?? [];
          const dow = warsawDayOfWeek(d);
          const isToday = d === today;
          const dayRevenue = dayBookings.reduce(
            (s, b) => s + (b.service?.price_pln ?? 0),
            0
          );

          return (
            <div key={d}>
              <div className="mb-3 flex items-baseline justify-between border-b border-zinc-800/60 pb-2">
                <h2 className="text-lg font-medium">
                  <span
                    className={
                      isToday ? "text-[var(--color-accent)]" : "text-zinc-200"
                    }
                  >
                    {dayLabels[dow]}
                  </span>
                  <span className="ml-2 text-sm text-zinc-500">
                    {formatShortDate(d)}
                  </span>
                  {isToday && (
                    <span className="ml-2 text-xs uppercase tracking-wider text-[var(--color-accent)]">
                      dziś
                    </span>
                  )}
                </h2>
                <p className="font-mono text-sm text-zinc-500">
                  {dayBookings.length} ·{" "}
                  <span className="text-zinc-300">{dayRevenue} zł</span>
                </p>
              </div>

              {dayBookings.length === 0 ? (
                <p className="px-1 text-sm text-zinc-600">Wolny dzień.</p>
              ) : (
                <ul className="space-y-2">
                  {dayBookings.map((b) => {
                    const busyStaffIds = dayBookings
                      .filter((other) => other.id !== b.id && other.staff_id && new Date(other.starts_at) < new Date(b.ends_at) && new Date(other.ends_at) > new Date(b.starts_at))
                      .map((other) => other.staff_id as string);
                    return <BookingRow key={b.id} b={b} allStaff={allStaff} busyStaffIds={busyStaffIds} />;
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
