import Link from "next/link";
import { getBookingsBetween } from "@/lib/db/bookings";
import { getActiveStaff } from "@/lib/db/staff";
import { getBusinessHours } from "@/lib/db/services";
import { DayBookingCard } from "./day-booking-card";
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

type View = "dzien" | "tydzien" | "miesiac";

function startOfMonth(dateStr: string): string {
  return dateStr.slice(0, 7) + "-01";
}

function daysInMonth(dateStr: string): number {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export default async function HarmonogramPage({
  searchParams,
}: {
  searchParams: Promise<{ widok?: string; od?: string }>;
}) {
  const { widok, od } = await searchParams;
  const view: View = widok === "dzien" || widok === "miesiac" ? widok : "tydzien";
  const today = warsawToday();
  const baseDate = od && /^\d{4}-\d{2}-\d{2}$/.test(od) ? od : today;

  const [allStaff, hours] = await Promise.all([getActiveStaff(), getBusinessHours()]);

  // ── Determine date range to fetch ─────────────────────────────────────────
  let startDate: string;
  let endDate: string;

  if (view === "dzien") {
    startDate = baseDate;
    endDate = baseDate;
  } else if (view === "miesiac") {
    startDate = startOfMonth(baseDate);
    const count = daysInMonth(baseDate);
    endDate = addDays(startDate, count - 1);
  } else {
    startDate = baseDate;
    endDate = addDays(baseDate, 6);
  }

  const startIso = warsawDayBoundsUtc(startDate).startIso;
  const endIso = warsawDayBoundsUtc(endDate).endIso;

  const all = await getBookingsBetween(startIso, endIso);
  const active = all.filter((b) => b.status !== "cancelled" && b.status !== "no_show");

  // Helper: group bookings by Warsaw date string
  function bookingDateStr(b: (typeof active)[0]): string {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Warsaw",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(b.starts_at));
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────
  function navUrl(v: View, date: string) {
    return `/admin/harmonogram?widok=${v}&od=${date}`;
  }

  const prevDate = view === "dzien"
    ? addDays(baseDate, -1)
    : view === "miesiac"
    ? addDays(startOfMonth(baseDate), -1).slice(0, 7) + "-01" // previous month
    : addDays(baseDate, -7);

  const nextDate = view === "dzien"
    ? addDays(baseDate, 1)
    : view === "miesiac"
    ? addDays(addDays(startOfMonth(baseDate), daysInMonth(baseDate)), 0) // next month start
    : addDays(baseDate, 7);

  const periodLabel = view === "dzien"
    ? `${dayLabels[warsawDayOfWeek(baseDate)]}, ${formatShortDate(baseDate)}`
    : view === "miesiac"
    ? new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(new Date(baseDate + "T12:00:00Z"))
    : `${formatShortDate(startDate)} — ${formatShortDate(endDate)}`;

  // ── Staff stats ────────────────────────────────────────────────────────────
  const staffStats = allStaff.map((s) => {
    const bookings = active.filter((b) => b.staff_id === s.id);
    return { ...s, count: bookings.length, revenue: bookings.reduce((sum, b) => sum + (b.service?.price_pln ?? 0), 0) };
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Harmonogram</h1>
          <p className="mt-1 text-sm text-zinc-500">{periodLabel}</p>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 p-1">
          {(["dzien", "tydzien", "miesiac"] as View[]).map((v) => (
            <Link
              key={v}
              href={navUrl(v, view === "miesiac" && v !== "miesiac" ? today : baseDate)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === v
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {v === "dzien" ? "Dzień" : v === "tydzien" ? "Tydzień" : "Miesiąc"}
            </Link>
          ))}
        </div>

        {/* Prev / Today / Next */}
        <div className="flex items-center gap-2">
          <Link href={navUrl(view, prevDate)} className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200">←</Link>
          <Link href={navUrl(view, today)} className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200">Dziś</Link>
          <Link href={navUrl(view, nextDate)} className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200">→</Link>
        </div>
      </div>

      {/* Staff stats */}
      {staffStats.some((s) => s.count > 0) && (
        <div className="mt-5 flex flex-wrap gap-3">
          {staffStats.filter((s) => s.count > 0).map((s) => (
            <div key={s.id} className="flex items-center gap-2.5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <div>
                <p className="text-sm font-medium text-zinc-200">{s.name}</p>
                <p className="font-mono text-xs text-zinc-500">{s.count} rez · {s.revenue} zł</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        {view === "dzien" && <DayView date={baseDate} active={active} allStaff={allStaff} hours={hours} bookingDateStr={bookingDateStr} today={today} />}
        {view === "tydzien" && <WeekView startDate={startDate} active={active} allStaff={allStaff} bookingDateStr={bookingDateStr} today={today} navUrl={navUrl} />}
        {view === "miesiac" && <MonthView baseDate={baseDate} active={active} bookingDateStr={bookingDateStr} today={today} navUrl={navUrl} />}
      </div>
    </section>
  );
}

// ── Day view ──────────────────────────────────────────────────────────────────
function DayView({
  date,
  active,
  allStaff,
  hours,
  bookingDateStr,
  today,
}: {
  date: string;
  active: Awaited<ReturnType<typeof getBookingsBetween>>;
  allStaff: { id: string; name: string; color: string }[];
  hours: Awaited<ReturnType<typeof getBusinessHours>>;
  bookingDateStr: (b: (typeof active)[0]) => string;
  today: string;
}) {
  const dayOfWeek = warsawDayOfWeek(date);
  const dayHours = hours.find((h) => h.day_of_week === dayOfWeek);
  const openTime = dayHours?.open_time ?? "08:00:00";
  const closeTime = dayHours?.close_time ?? "20:00:00";

  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const startMin = openH * 60 + openM;
  const endMin = closeH * 60 + closeM;

  const slots: string[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const min = String(m % 60).padStart(2, "0");
    slots.push(`${h}:${min}`);
  }

  const dayBookings = active.filter((b) => bookingDateStr(b) === date);

  function bookingAtSlot(staffId: string, slotTime: string) {
    return dayBookings.find((b) => {
      if (b.staff_id !== staffId) return false;
      const [sh, sm] = slotTime.split(":").map(Number);
      const slotMinStart = sh * 60 + sm;
      const slotMinEnd = slotMinStart + 30;
      const bStart = new Date(b.starts_at);
      const bEnd = new Date(b.ends_at);
      const bStartMin = bStart.getUTCHours() * 60 + bStart.getUTCMinutes() + 60; // +60 for Warsaw UTC+1 approx
      const bEndMin = bEnd.getUTCHours() * 60 + bEnd.getUTCMinutes() + 60;
      return bStartMin < slotMinEnd && bEndMin > slotMinStart;
    });
  }

  const isToday = date === today;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800/60" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
            <th className="w-16 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Godz.</th>
            {allStaff.length > 0 ? allStaff.map((s) => (
              <th key={s.id} className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider" style={{ color: s.color }}>
                {s.name}
              </th>
            )) : (
              <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Rezerwacje</th>
            )}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, i) => (
            <tr key={slot} className={`border-b border-zinc-800/30 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/10"}`}>
              <td className="px-3 py-1 align-top">
                <span className="font-mono text-xs text-zinc-600">{slot}</span>
              </td>
              {allStaff.length > 0 ? allStaff.map((s) => {
                const booking = bookingAtSlot(s.id, slot);
                const bStart = booking ? formatWarsawTime(booking.starts_at) : null;
                const isFirstSlot = bStart === slot || (booking && formatWarsawTime(booking.starts_at).slice(0, 5) === slot);
                return (
                  <td key={s.id} className="px-2 py-1 align-top">
                    {booking && isFirstSlot ? (
                      <DayBookingCard
                        id={booking.id}
                        startsAtIso={booking.starts_at}
                        endsAtIso={booking.ends_at}
                        customerName={booking.customer_name}
                        serviceName={booking.service?.name ?? null}
                        timeLabel={formatWarsawTime(booking.starts_at)}
                        color={s.color}
                      />
                    ) : booking ? (
                      <div className="h-5" style={{ borderLeft: `2px solid ${s.color}40` }} />
                    ) : (
                      <Link
                        href={`/admin/rezerwacja/nowa?data=${date}&godzina=${slot}`}
                        className="block h-7 w-full rounded hover:bg-zinc-800/40"
                        aria-label={`Dodaj rezerwację ${slot}`}
                      />
                    )}
                  </td>
                );
              }) : (
                <td className="px-2 py-1 align-top">
                  {dayBookings.filter((b) => formatWarsawTime(b.starts_at).slice(0, 5) === slot).map((b) => (
                    <div key={b.id} className="mb-1 rounded border border-zinc-800 px-2 py-1">
                      <p className="font-mono text-xs text-zinc-400">{formatWarsawTime(b.starts_at)}</p>
                      <p className="text-xs text-zinc-300">{b.customer_name}</p>
                    </div>
                  ))}
                  {dayBookings.filter((b) => formatWarsawTime(b.starts_at).slice(0, 5) === slot).length === 0 && (
                    <Link href={`/admin/rezerwacja/nowa?data=${date}&godzina=${slot}`} className="block h-7 w-full rounded hover:bg-zinc-800/40" />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {dayHours?.closed && (
        <p className="px-4 py-6 text-center text-sm text-zinc-600">Dzień wolny według godzin biznesu.</p>
      )}
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────
function WeekView({
  startDate,
  active,
  allStaff,
  bookingDateStr,
  today,
  navUrl,
}: {
  startDate: string;
  active: Awaited<ReturnType<typeof getBookingsBetween>>;
  allStaff: { id: string; name: string; color: string }[];
  bookingDateStr: (b: (typeof active)[0]) => string;
  today: string;
  navUrl: (v: View, d: string) => string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const byDayStaff = new Map<string, Map<string, typeof active>>();
  for (const b of active) {
    const ds = bookingDateStr(b);
    if (!byDayStaff.has(ds)) byDayStaff.set(ds, new Map());
    const sid = b.staff_id ?? "__none__";
    const dm = byDayStaff.get(ds)!;
    if (!dm.has(sid)) dm.set(sid, []);
    dm.get(sid)!.push(b);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800/60" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
            <th className="w-28 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Dzień</th>
            {allStaff.map((s) => (
              <th key={s.id} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: s.color }}>{s.name}</th>
            ))}
            {allStaff.length === 0 && <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Rezerwacje</th>}
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => {
            const dow = warsawDayOfWeek(d);
            const isToday = d === today;
            const dayMap = byDayStaff.get(d);
            const totalForDay = active.filter((b) => bookingDateStr(b) === d).length;

            return (
              <tr key={d} className={`border-b border-zinc-800/60 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/20"}`}>
                <td className="px-4 py-3 align-top">
                  <Link href={navUrl("dzien", d)} className="block hover:opacity-70">
                    <p className={`font-medium ${isToday ? "text-[var(--color-accent)]" : "text-zinc-300"}`}>{dayLabels[dow]}</p>
                    <p className="font-mono text-xs text-zinc-600">{formatShortDate(d)}</p>
                    {totalForDay > 0 && <p className="mt-1 text-xs text-zinc-500">{totalForDay} rez.</p>}
                  </Link>
                </td>
                {allStaff.map((s) => {
                  const bookings = dayMap?.get(s.id) ?? [];
                  return (
                    <td key={s.id} className="px-3 py-3 align-top">
                      {bookings.length === 0 ? (
                        <Link href={navUrl("dzien", d)} className="block h-full min-h-[3rem] w-full text-zinc-700 hover:text-zinc-500">—</Link>
                      ) : (
                        <ul className="space-y-1.5">
                          {bookings.map((b) => (
                            <li key={b.id} className="rounded-lg px-2 py-1.5" style={{ backgroundColor: `${s.color}18`, borderLeft: `2px solid ${s.color}` }}>
                              <p className="font-mono text-xs text-zinc-300">{formatWarsawTime(b.starts_at)}</p>
                              <p className="text-xs font-medium text-zinc-200">{b.customer_name}</p>
                              {b.service && <p className="text-xs text-zinc-500">{b.service.name}</p>}
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
  );
}

// ── Month view ────────────────────────────────────────────────────────────────
function MonthView({
  baseDate,
  active,
  bookingDateStr,
  today,
  navUrl,
}: {
  baseDate: string;
  active: Awaited<ReturnType<typeof getBookingsBetween>>;
  bookingDateStr: (b: (typeof active)[0]) => string;
  today: string;
  navUrl: (v: View, d: string) => string;
}) {
  const monthStart = startOfMonth(baseDate);
  const [y, m] = monthStart.split("-").map(Number);
  const count = daysInMonth(baseDate);
  const firstDow = new Date(Date.UTC(y, m - 1, 1, 12)).getUTCDay(); // 0=Sun
  // Monday-first offset
  const offset = firstDow === 0 ? 6 : firstDow - 1;

  // Count bookings per day
  const countByDay = new Map<string, number>();
  for (const b of active) {
    const ds = bookingDateStr(b);
    countByDay.set(ds, (countByDay.get(ds) ?? 0) + 1);
  }

  const cells: (string | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: count }, (_, i) => addDays(monthStart, i)),
  ];
  // Pad to complete weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const DOW_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

  return (
    <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-zinc-800/60 bg-zinc-900/60">
        {DOW_LABELS.map((l) => (
          <div key={l} className="py-2 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">{l}</div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        const weekStart = week.find((d) => d !== null)!;
        return (
          <div key={wi} className="grid grid-cols-7 border-b border-zinc-800/30 last:border-0">
            {week.map((d, di) => {
              if (!d) return <div key={di} className="min-h-[64px] border-r border-zinc-800/30 last:border-0 bg-zinc-950/50" />;
              const cnt = countByDay.get(d) ?? 0;
              const isToday = d === today;
              const isCurrentMonth = d.slice(0, 7) === baseDate.slice(0, 7);
              const dayNum = parseInt(d.split("-")[2]);

              return (
                <Link
                  key={di}
                  href={navUrl("dzien", d)}
                  className={`group min-h-[64px] border-r border-zinc-800/30 last:border-0 p-2 transition-colors hover:bg-zinc-800/30 ${!isCurrentMonth ? "opacity-40" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${
                      isToday
                        ? "bg-[var(--color-accent)] text-zinc-950"
                        : "text-zinc-400 group-hover:text-zinc-200"
                    }`}>
                      {dayNum}
                    </span>
                    {cnt > 0 && (
                      <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                        {cnt}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
