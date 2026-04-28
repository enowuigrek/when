import Link from "next/link";
import { getBookingsBetween } from "@/lib/db/bookings";
import { getActiveStaff } from "@/lib/db/staff";
import { getBusinessHours, getServices } from "@/lib/db/services";
import { DayBookingCard } from "./day-booking-card";
import { BookingManagementButton, type BookingForModal, type ServiceOption } from "@/components/booking-management-modal";
import type { BookingWithService } from "@/lib/db/bookings";

function toModalBooking(b: BookingWithService): BookingForModal {
  return {
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    serviceId: b.service_id,
    serviceName: b.service?.name ?? null,
    staffId: b.staff_id,
    staffName: b.staff?.name ?? null,
    staffColor: b.staff?.color ?? null,
    notes: b.notes,
    status: b.status,
  };
}
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

/** Warsaw-local "HH:MM" → minutes since midnight, derived from UTC instant. */
function warsawMinutes(iso: string): number {
  const t = formatWarsawTime(iso); // "HH:MM"
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Warsaw-local YYYY-MM-DD for an UTC instant. */
function warsawDate(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
}

export default async function HarmonogramPage({
  searchParams,
}: {
  searchParams: Promise<{ widok?: string; od?: string; pracownik?: string }>;
}) {
  const { widok, od, pracownik } = await searchParams;
  const view: View = widok === "dzien" || widok === "miesiac" ? widok : "tydzien";
  const today = warsawToday();
  const baseDate = od && /^\d{4}-\d{2}-\d{2}$/.test(od) ? od : today;

  // ── Determine date range before any DB calls ──────────────────────────────
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

  // Fetch all in parallel
  const [allStaff, hours, all, allServicesRaw] = await Promise.all([
    getActiveStaff(),
    getBusinessHours(),
    getBookingsBetween(startIso, endIso),
    getServices(),
  ]);
  const allServices = allServicesRaw.map((s) => ({ id: s.id, name: s.name, duration_min: s.duration_min, price_pln: s.price_pln }));

  const selectedStaffId = pracownik && allStaff.some((s) => s.id === pracownik) ? pracownik : null;
  const visibleStaff = selectedStaffId ? allStaff.filter((s) => s.id === selectedStaffId) : allStaff;

  const activeAll = all.filter((b) => b.status !== "cancelled" && b.status !== "no_show");
  const active = selectedStaffId ? activeAll.filter((b) => b.staff_id === selectedStaffId) : activeAll;

  // ── Navigation helpers ─────────────────────────────────────────────────────
  function navUrl(v: View, date: string, staffOverride?: string | null) {
    const params = new URLSearchParams({ widok: v, od: date });
    const sid = staffOverride === undefined ? selectedStaffId : staffOverride;
    if (sid) params.set("pracownik", sid);
    return `/admin/harmonogram?${params.toString()}`;
  }

  const prevDate = view === "dzien"
    ? addDays(baseDate, -1)
    : view === "miesiac"
    ? addDays(startOfMonth(baseDate), -1).slice(0, 7) + "-01"
    : addDays(baseDate, -7);

  const nextDate = view === "dzien"
    ? addDays(baseDate, 1)
    : view === "miesiac"
    ? addDays(addDays(startOfMonth(baseDate), daysInMonth(baseDate)), 0)
    : addDays(baseDate, 7);

  const periodLabel = view === "dzien"
    ? `${dayLabels[warsawDayOfWeek(baseDate)]}, ${formatShortDate(baseDate)}`
    : view === "miesiac"
    ? new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(new Date(baseDate + "T12:00:00Z"))
    : `${formatShortDate(startDate)} — ${formatShortDate(endDate)}`;

  // ── Staff stats (always over allStaff so filter tiles show counts) ────────
  const staffStats = allStaff.map((s) => ({
    ...s,
    count: activeAll.filter((b) => b.staff_id === s.id).length,
  }));
  const totalCount = activeAll.length;

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

      {/* Staff filter tiles (merged with period summary) */}
      {allStaff.length > 1 && (
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Link
            href={navUrl(view, baseDate, null)}
            aria-pressed={!selectedStaffId}
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-colors ${
              !selectedStaffId
                ? "border-zinc-600 bg-zinc-800/60 text-zinc-100"
                : "border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <span className="text-sm font-medium">Wszyscy</span>
            <span className="font-mono text-xs text-zinc-500">{totalCount}</span>
          </Link>
          {staffStats.map((s) => {
            const isActive = selectedStaffId === s.id;
            return (
              <Link
                key={s.id}
                href={navUrl(view, baseDate, s.id)}
                aria-pressed={isActive}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-colors ${
                  isActive
                    ? "border-zinc-600 bg-zinc-800/60 text-zinc-100"
                    : "border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-medium">{s.name}</span>
                <span className="font-mono text-xs text-zinc-500">{s.count}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        {view === "dzien" && <DayView date={baseDate} active={active} visibleStaff={visibleStaff} allStaff={allStaff} allServices={allServices} hours={hours} today={today} />}
        {view === "tydzien" && <WeekView startDate={startDate} active={active} visibleStaff={visibleStaff} allStaff={allStaff} allServices={allServices} today={today} navUrl={navUrl} />}
        {view === "miesiac" && <MonthView baseDate={baseDate} active={active} today={today} navUrl={navUrl} />}
      </div>
    </section>
  );
}

// ── Day view ──────────────────────────────────────────────────────────────────
function DayView({
  date,
  active,
  visibleStaff,
  allStaff,
  allServices,
  hours,
  today,
}: {
  date: string;
  active: Awaited<ReturnType<typeof getBookingsBetween>>;
  visibleStaff: { id: string; name: string; color: string }[];
  allStaff: { id: string; name: string; color: string }[];
  allServices: ServiceOption[];
  hours: Awaited<ReturnType<typeof getBusinessHours>>;
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

  const slots: { label: string; min: number }[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const min = String(m % 60).padStart(2, "0");
    slots.push({ label: `${h}:${min}`, min: m });
  }

  const dayBookings = active.filter((b) => warsawDate(b.starts_at) === date);

  function bookingAtSlot(staffId: string, slotMin: number) {
    return dayBookings.find((b) => {
      if (b.staff_id !== staffId) return false;
      const bStart = warsawMinutes(b.starts_at);
      const bEnd = warsawMinutes(b.ends_at);
      return bStart < slotMin + 30 && bEnd > slotMin;
    });
  }

  const isToday = date === today;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800/60" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
      <table className="border-collapse text-sm w-full" style={{ tableLayout: "fixed", minWidth: visibleStaff.length > 0 ? 64 + visibleStaff.length * 180 : undefined }}>
        <thead>
          <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500" style={{ width: 64 }}>Godz.</th>
            {visibleStaff.length > 0 ? visibleStaff.map((s) => (
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
            <tr key={slot.label} className={`border-b border-zinc-800/30 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/10"}`}>
              <td className="px-3 py-1 align-top">
                <span className={`font-mono text-xs ${isToday ? "text-zinc-500" : "text-zinc-600"}`}>{slot.label}</span>
              </td>
              {visibleStaff.length > 0 ? visibleStaff.map((s) => {
                const booking = bookingAtSlot(s.id, slot.min);
                // booking starts anywhere in this 30-min bucket
                const isFirstSlot = booking && warsawMinutes(booking.starts_at) >= slot.min && warsawMinutes(booking.starts_at) < slot.min + 30;
                return (
                  <td key={s.id} className="px-2 py-1 align-top">
                    {booking && isFirstSlot ? (
                      <DayBookingCard
                        booking={toModalBooking(booking)}
                        allStaff={allStaff}
                        allServices={allServices}
                        timeLabel={formatWarsawTime(booking.starts_at)}
                        color={s.color}
                      />
                    ) : booking ? (
                      <div className="h-5" style={{ borderLeft: `2px solid ${s.color}40` }} />
                    ) : (
                      <Link
                        href={`/admin/rezerwacja/nowa?data=${date}&godzina=${slot.label}`}
                        className="block h-7 w-full rounded hover:bg-zinc-800/40"
                        aria-label={`Dodaj rezerwację ${slot.label}`}
                      />
                    )}
                  </td>
                );
              }) : (
                <td className="px-2 py-1 align-top">
                  {dayBookings.filter((b) => warsawMinutes(b.starts_at) === slot.min).map((b) => (
                    <div key={b.id} className="mb-1 rounded border border-zinc-800 px-2 py-1">
                      <p className="font-mono text-xs text-zinc-400">{formatWarsawTime(b.starts_at)}</p>
                      <p className="text-xs text-zinc-300">{b.customer_name}</p>
                    </div>
                  ))}
                  {dayBookings.filter((b) => warsawMinutes(b.starts_at) === slot.min).length === 0 && (
                    <Link href={`/admin/rezerwacja/nowa?data=${date}&godzina=${slot.label}`} className="block h-7 w-full rounded hover:bg-zinc-800/40" />
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
  visibleStaff,
  allStaff,
  allServices,
  today,
  navUrl,
}: {
  startDate: string;
  active: Awaited<ReturnType<typeof getBookingsBetween>>;
  visibleStaff: { id: string; name: string; color: string }[];
  allStaff: { id: string; name: string; color: string }[];
  allServices: ServiceOption[];
  today: string;
  navUrl: (v: View, d: string) => string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const byDayStaff = new Map<string, Map<string, typeof active>>();
  for (const b of active) {
    const ds = warsawDate(b.starts_at);
    if (!byDayStaff.has(ds)) byDayStaff.set(ds, new Map());
    const sid = b.staff_id ?? "__none__";
    const dm = byDayStaff.get(ds)!;
    if (!dm.has(sid)) dm.set(sid, []);
    dm.get(sid)!.push(b);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800/60" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
      <table className="border-collapse text-sm w-full" style={{ tableLayout: "fixed", minWidth: visibleStaff.length > 0 ? 112 + visibleStaff.length * 200 : undefined }}>
        <thead>
          <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500" style={{ width: 112 }}>Dzień</th>
            {visibleStaff.map((s) => (
              <th key={s.id} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: s.color }}>{s.name}</th>
            ))}
            {visibleStaff.length === 0 && <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Rezerwacje</th>}
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => {
            const dow = warsawDayOfWeek(d);
            const isToday = d === today;
            const dayMap = byDayStaff.get(d);
            const totalForDay = active.filter((b) => warsawDate(b.starts_at) === d).length;

            return (
              <tr key={d} className={`border-b border-zinc-800/60 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/20"}`}>
                <td className="px-4 py-3 align-top">
                  <Link href={navUrl("dzien", d)} className="block hover:opacity-70">
                    <p className={`font-medium ${isToday ? "text-[var(--color-accent)]" : "text-zinc-300"}`}>{dayLabels[dow]}</p>
                    <p className="font-mono text-xs text-zinc-600">{formatShortDate(d)}</p>
                    {totalForDay > 0 && <p className="mt-1 text-xs text-zinc-500">{totalForDay} rez.</p>}
                  </Link>
                </td>
                {visibleStaff.map((s) => {
                  const bookings = dayMap?.get(s.id) ?? [];
                  return (
                    <td key={s.id} className="px-3 py-3 align-top">
                      {bookings.length === 0 ? (
                        <Link href={navUrl("dzien", d)} className="block h-full min-h-[3rem] w-full text-zinc-700 hover:text-zinc-500">—</Link>
                      ) : (
                        <ul className="space-y-1.5">
                          {bookings.map((b) => (
                            <li key={b.id}>
                              <BookingManagementButton
                                booking={toModalBooking(b)}
                                allStaff={allStaff}
                                allServices={allServices}
                                className="block w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:brightness-125"
                              >
                                <div style={{ backgroundColor: `${s.color}18`, borderLeft: `2px solid ${s.color}`, padding: "2px 6px", borderRadius: 4 }}>
                                  <p className="font-mono text-xs text-zinc-300">{formatWarsawTime(b.starts_at)}</p>
                                  <p className="text-xs font-medium text-zinc-200">{b.customer_name}</p>
                                  {b.service && <p className="text-xs text-zinc-500">{b.service.name}</p>}
                                </div>
                              </BookingManagementButton>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  );
                })}
                {visibleStaff.length === 0 && (
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
  today,
  navUrl,
}: {
  baseDate: string;
  active: Awaited<ReturnType<typeof getBookingsBetween>>;
  today: string;
  navUrl: (v: View, d: string) => string;
}) {
  const monthStart = startOfMonth(baseDate);
  const [y, m] = monthStart.split("-").map(Number);
  const count = daysInMonth(baseDate);
  const firstDow = new Date(Date.UTC(y, m - 1, 1, 12)).getUTCDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;

  const countByDay = new Map<string, number>();
  for (const b of active) {
    const ds = warsawDate(b.starts_at);
    countByDay.set(ds, (countByDay.get(ds) ?? 0) + 1);
  }

  const cells: (string | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: count }, (_, i) => addDays(monthStart, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const DOW_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

  return (
    <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-zinc-800/60 bg-zinc-900/60">
        {DOW_LABELS.map((l) => (
          <div key={l} className="py-2 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">{l}</div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-zinc-800/30 last:border-0">
          {week.map((d, di) => {
            if (!d) return <div key={di} className="min-h-[64px] border-r border-zinc-800/30 last:border-0 bg-zinc-950/50" />;
            const cnt = countByDay.get(d) ?? 0;
            const isToday = d === today;
            const isCurrentMonth = d.slice(0, 7) === baseDate.slice(0, 7);
            const dayNum = parseInt(d.split("-")[2]);

            if (!isCurrentMonth) {
              return (
                <div key={di} className="min-h-[64px] border-r border-zinc-800/30 last:border-0 bg-zinc-950/80 p-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium text-zinc-800">
                    {dayNum}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={di}
                href={navUrl("dzien", d)}
                className="group min-h-[64px] border-r border-zinc-800/30 last:border-0 p-2 transition-colors hover:bg-zinc-800/30"
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
      ))}
    </div>
  );
}
