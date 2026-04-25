import Link from "next/link";
import { getBookingsBetween } from "@/lib/db/bookings";
import { warsawToday, warsawDayBoundsUtc } from "@/lib/slots";
import { BookingRow } from "./booking-row";
import { dayLabels } from "@/lib/business";
import { getActiveStaff } from "@/lib/db/staff";

export const metadata = {
  title: "Dziś",
  robots: { index: false },
};

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = warsawToday();
  const viewDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  const { startIso, endIso } = warsawDayBoundsUtc(viewDate);

  const [bookings, allStaff] = await Promise.all([
    getBookingsBetween(startIso, endIso),
    getActiveStaff(),
  ]);
  const active = bookings.filter((b) => b.status !== "cancelled");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const [y, m, d] = viewDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();

  const totalRevenue = active.reduce(
    (sum, b) => sum + (b.service?.price_pln ?? 0),
    0
  );

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-zinc-500">
            {dayLabels[dow]}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {viewDate === today ? "Dziś" : viewDate}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            Rezerwacje / Utarg
          </p>
          <p className="font-mono text-xl text-zinc-100">
            {active.length} ·{" "}
            <span className="text-[var(--color-accent)]">
              {totalRevenue} zł
            </span>
          </p>
        </div>
      </div>

      <div className="mt-8">
        {active.length === 0 ? (
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-8 text-center">
            <p className="text-zinc-400">Brak rezerwacji na dziś.</p>
            <Link
              href="/admin/tydzien"
              className="mt-3 inline-block text-sm text-[var(--color-accent)] hover:underline"
            >
              Zobacz tydzień →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {active.map((b) => (
              <BookingRow key={b.id} b={b} allStaff={allStaff} />
            ))}
          </ul>
        )}
      </div>

      {cancelled.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-300">
            Anulowane ({cancelled.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {cancelled.map((b) => (
              <BookingRow key={b.id} b={b} allStaff={allStaff} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
