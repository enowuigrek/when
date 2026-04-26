import { getBookingsBetween } from "@/lib/db/bookings";
import { getActiveStaff } from "@/lib/db/staff";
import {
  warsawToday,
  addDays,
  warsawDayBoundsUtc,
  warsawDayOfWeek,
  formatShortDate,
  formatWarsawTime,
} from "@/lib/slots";
import { dayLabels } from "@/lib/business";

export const metadata = { title: "Harmonogram", robots: { index: false } };

const DAYS_COUNT = 7;

export default async function HarmonogramPage({
  searchParams,
}: {
  searchParams: Promise<{ od?: string }>;
}) {
  const { od } = await searchParams;
  const today = warsawToday();
  const startDate = od && /^\d{4}-\d{2}-\d{2}$/.test(od) ? od : today;
  const days = Array.from({ length: DAYS_COUNT }, (_, i) => addDays(startDate, i));

  const startIso = warsawDayBoundsUtc(days[0]).startIso;
  const endIso = warsawDayBoundsUtc(days[DAYS_COUNT - 1]).endIso;

  const [all, allStaff] = await Promise.all([
    getBookingsBetween(startIso, endIso),
    getActiveStaff(),
  ]);
  const active = all.filter((b) => b.status !== "cancelled");

  // Group by day and staff
  const byDayStaff = new Map<string, Map<string, typeof active>>();
  for (const b of active) {
    const dateStr = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(b.starts_at));

    if (!byDayStaff.has(dateStr)) byDayStaff.set(dateStr, new Map());
    const staffId = b.staff_id ?? "__none__";
    const dayMap = byDayStaff.get(dateStr)!;
    if (!dayMap.has(staffId)) dayMap.set(staffId, []);
    dayMap.get(staffId)!.push(b);
  }

  // Per-staff stats for the week
  const staffStats = allStaff.map((s) => {
    const bookings = active.filter((b) => b.staff_id === s.id);
    const revenue = bookings.reduce((sum, b) => sum + (b.service?.price_pln ?? 0), 0);
    return { ...s, count: bookings.length, revenue };
  });
  const unassigned = active.filter((b) => !b.staff_id);

  const prevWeek = addDays(startDate, -7);
  const nextWeek = addDays(startDate, 7);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Harmonogram</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {formatShortDate(days[0])} — {formatShortDate(days[DAYS_COUNT - 1])}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/admin/harmonogram?od=${prevWeek}`}
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            ← Poprzedni
          </a>
          <a
            href={`/admin/harmonogram?od=${today}`}
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            Dziś
          </a>
          <a
            href={`/admin/harmonogram?od=${nextWeek}`}
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            Następny →
          </a>
        </div>
      </div>

      {/* Staff stats row */}
      <div className="mt-6 flex flex-wrap gap-3">
        {staffStats.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2.5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <div>
              <p className="text-sm font-medium text-zinc-200">{s.name}</p>
              <p className="font-mono text-xs text-zinc-500">
                {s.count} rez · {s.revenue} zł
              </p>
            </div>
          </div>
        ))}
        {unassigned.length > 0 && (
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
            <span className="h-3 w-3 shrink-0 rounded-full bg-zinc-700" />
            <div>
              <p className="text-sm font-medium text-zinc-500">Nieprzypisane</p>
              <p className="font-mono text-xs text-zinc-600">{unassigned.length} rez</p>
            </div>
          </div>
        )}
      </div>

      {/* Grid: rows = days, columns = staff */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800/60">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
              <th className="w-28 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Dzień
              </th>
              {allStaff.map((s) => (
                <th
                  key={s.id}
                  className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: s.color }}
                >
                  {s.name}
                </th>
              ))}
              {allStaff.length === 0 && (
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Rezerwacje
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => {
              const dow = warsawDayOfWeek(d);
              const isToday = d === today;
              const dayMap = byDayStaff.get(d);
              const totalForDay = active.filter((b) => {
                const ds = new Intl.DateTimeFormat("sv-SE", {
                  timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit",
                }).format(new Date(b.starts_at));
                return ds === d;
              }).length;

              return (
                <tr
                  key={d}
                  className={`border-b border-zinc-800/60 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/20"} ${isToday ? "ring-1 ring-inset ring-[var(--color-accent)]/20" : ""}`}
                >
                  <td className="px-4 py-3 align-top">
                    <p className={`font-medium ${isToday ? "text-[var(--color-accent)]" : "text-zinc-300"}`}>
                      {dayLabels[dow]}
                    </p>
                    <p className="font-mono text-xs text-zinc-600">{formatShortDate(d)}</p>
                    {totalForDay > 0 && (
                      <p className="mt-1 text-xs text-zinc-500">{totalForDay} rez.</p>
                    )}
                  </td>
                  {allStaff.map((s) => {
                    const bookings = dayMap?.get(s.id) ?? [];
                    return (
                      <td key={s.id} className="px-3 py-3 align-top">
                        {bookings.length === 0 ? (
                          <span className="text-xs text-zinc-700">—</span>
                        ) : (
                          <ul className="space-y-1.5">
                            {bookings.map((b) => (
                              <li
                                key={b.id}
                                className="rounded-lg px-2 py-1.5"
                                style={{ backgroundColor: `${s.color}18`, borderLeft: `2px solid ${s.color}` }}
                              >
                                <p className="font-mono text-xs text-zinc-300">
                                  {formatWarsawTime(b.starts_at)}
                                </p>
                                <p className="text-xs font-medium text-zinc-200">
                                  {b.customer_name}
                                </p>
                                {b.service && (
                                  <p className="text-xs text-zinc-500">{b.service.name}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                  {allStaff.length === 0 && (
                    <td className="px-3 py-3 align-top">
                      {(dayMap?.get("__none__") ?? []).map((b) => (
                        <div key={b.id} className="mb-1.5 rounded-lg border border-zinc-800 px-2 py-1.5">
                          <p className="font-mono text-xs text-zinc-400">{formatWarsawTime(b.starts_at)}</p>
                          <p className="text-xs text-zinc-300">{b.customer_name}</p>
                        </div>
                      ))}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
