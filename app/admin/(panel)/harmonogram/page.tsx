import Link from "next/link";
import { headers } from "next/headers";
import { getBookingsBetween, getBookingCountsByDay } from "@/lib/db/bookings";
import { getActiveStaff } from "@/lib/db/staff";
import { getBusinessHours, getServices } from "@/lib/db/services";
import { DayBookingCard } from "./day-booking-card";
import { NewBookingButton, type ServiceOption } from "@/components/booking-create-modal";
import { DayStaffCarousel } from "./day-staff-carousel";
import { ScheduleDatePicker } from "./schedule-date-picker";
import { BookingManagementButton, type BookingForModal } from "@/components/booking-management-modal";
import type { BookingWithService } from "@/lib/db/bookings";

function toModalBooking(b: BookingWithService): BookingForModal {
  const status = (
    b.status === "confirmed" || b.status === "cancelled" ||
    b.status === "completed" || b.status === "no_show"
  ) ? b.status : "confirmed";
  return {
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    serviceName: b.service?.name ?? null,
    staffId: b.staff_id,
    staffName: b.staff?.name ?? null,
    staffColor: b.staff?.color ?? null,
    notes: b.notes,
    status,
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

type View = "dzien" | "tydzien";

function startOfMonth(dateStr: string): string {
  return dateStr.slice(0, 7) + "-01";
}

function daysInMonth(dateStr: string): number {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** Monday of the week containing a Warsaw date. */
function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Mon = 0
  return addDays(dateStr, -dow);
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
  searchParams: Promise<{ widok?: string; od?: string; pracownik?: string; pracownicy?: string }>;
}) {
  const h = await headers();
  const demoSlug = h.get("x-demo-slug");
  // When inside a /demo/{slug}/* URL all internal links must keep the prefix
  // so the proxy keeps injecting x-demo-slug on every navigation.
  const adminBase = demoSlug ? `/demo/${demoSlug}` : "/admin";

  const { widok, od, pracownik, pracownicy } = await searchParams;
  // Day is the operational view — the panel root already redirects here,
  // so week-as-fallback was an inconsistency rather than a choice.
  const view: View = widok === "tydzien" ? "tydzien" : "dzien";
  const today = warsawToday();
  const baseDate = od && /^\d{4}-\d{2}-\d{2}$/.test(od) ? od : today;

  // ── Determine date range before any DB calls ──────────────────────────────
  let startDate: string;
  let endDate: string;

  if (view === "dzien") {
    startDate = baseDate;
    endDate = baseDate;
  } else {
    // Monday-aligned rather than seven days from whatever was clicked: the
    // calendar picks whole weeks, and Grafik already works this way, so a
    // rolling window would highlight a different week than the table shows.
    startDate = mondayOf(baseDate);
    endDate = addDays(startDate, 6);
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
  // Feeds the create-booking modal opened from an empty slot.
  const services: ServiceOption[] = allServicesRaw.map((s) => ({
    id: s.id, name: s.name, duration_min: s.duration_min, price_pln: s.price_pln,
  }));

  // Empty selection means "everyone" — the filter is off rather than excluding
  // all of them. `pracownik` is the old single-value param, still honoured so
  // links shared before multi-select keep working.
  const selectedIds = (pracownicy ?? pracownik ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((id) => allStaff.some((s) => s.id === id));
  const filtering = selectedIds.length > 0;

  const visibleStaff = filtering ? allStaff.filter((s) => selectedIds.includes(s.id)) : allStaff;

  const activeAll = all.filter((b) => b.status !== "cancelled" && b.status !== "no_show");
  const active = filtering
    ? activeAll.filter((b) => b.staff_id !== null && selectedIds.includes(b.staff_id))
    : activeAll;

  // ── Navigation helpers ─────────────────────────────────────────────────────
  function navUrl(v: View, date: string, ids: string[] = selectedIds) {
    const params = new URLSearchParams({ widok: v, od: date });
    if (ids.length) params.set("pracownicy", ids.join(","));
    return `${adminBase}/harmonogram?${params.toString()}`;
  }

  /** Add or drop one person; dropping the last one falls back to everyone. */
  function toggleStaffUrl(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    return navUrl(view, baseDate, next);
  }

  const periodLabel = view === "dzien"
    ? `${dayLabels[warsawDayOfWeek(baseDate)]}, ${formatShortDate(baseDate)}`
    : `${formatShortDate(startDate)} — ${formatShortDate(endDate)}`;

  // Days the calendar can reach without another round trip: the month either
  // side of what is selected, which is as far as one step of month navigation
  // gets you. Closed days come from business hours so they read as greyed out.
  const calWindowStart = startOfMonth(addDays(startOfMonth(baseDate), -1));
  const calWindowEnd = addDays(
    startOfMonth(addDays(startOfMonth(baseDate), daysInMonth(baseDate))),
    daysInMonth(addDays(startOfMonth(baseDate), daysInMonth(baseDate))) - 1
  );
  // Nothing is marked closed here. In a booking flow that state stops you
  // picking a day you cannot have; in the schedule a closed Sunday is still
  // worth opening — there may be something on it, and you may just want to
  // look. Greying them also made this calendar read differently from the
  // week-mode one, which has no such notion.
  const calendarDays: { date: string; closed: boolean }[] = [];
  for (let d = calWindowStart; d <= calWindowEnd; d = addDays(d, 1)) {
    calendarDays.push({ date: d, closed: false });
  }
  // Hrefs are built here rather than passed as callbacks: functions cannot
  // cross from a server component into a client one.
  const dayHrefMap: Record<string, string> = {};
  const weekHrefMap: Record<string, string> = {};
  for (const { date } of calendarDays) {
    dayHrefMap[date] = navUrl("dzien", date);
    const monday = mondayOf(date);
    if (!weekHrefMap[monday]) weekHrefMap[monday] = navUrl("tydzien", monday);
  }

  const dayCounts = await getBookingCountsByDay(
    warsawDayBoundsUtc(calWindowStart).startIso,
    warsawDayBoundsUtc(calWindowEnd).endIso
  );

  // Counts come from activeAll, not `active`, so a tile keeps showing its own
  // number while it is filtered out.
  const staffStats = allStaff.map((s) => ({
    ...s,
    count: activeAll.filter((b) => b.staff_id === s.id).length,
  }));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Harmonogram</h1>
          <p className="mt-1 text-sm text-zinc-500">{periodLabel}</p>
        </div>

        {/* View toggle and calendar are one cluster: both answer "what am I
            looking at". Left floating apart, the toggle read as stranded in
            the middle of the header. */}
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          <div className="flex items-center gap-1 self-start rounded-lg border border-zinc-800 p-1 sm:self-auto">
            {(["dzien", "tydzien"] as View[]).map((v) => (
              <Link
                key={v}
                href={navUrl(v, baseDate)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {v === "dzien" ? "Dzień" : "Tydzień"}
              </Link>
            ))}
          </div>

          <ScheduleDatePicker
            view={view}
            today={today}
            baseDate={baseDate}
            weekStart={mondayOf(baseDate)}
            todayWeekStart={mondayOf(today)}
            dayHref={dayHrefMap}
            weekHref={weekHrefMap}
            todayHref={navUrl(view, today)}
            badges={dayCounts}
            days={calendarDays}
          />
        </div>
      </div>

      {/*
        One row of toggles, replacing the old filter chips + a second row of
        summary cards that repeated the same people. Money is deliberately
        gone: it was noise here, and the number that matters when scanning a
        day is how many bookings someone has.

        Three states, because "everyone" is not the same as "each one picked":
        with no filter the tiles stay neutral and only Wszyscy reads as active;
        once anyone is picked, the chosen ones light up in their own column
        colour and the rest dim. Tiles wrap, so ten people become two calm
        rows rather than a cramped single line.

        Hidden below `sm`: there the day view turns into a one-person
        carousel and its strip of initials takes over both jumping between
        people and showing where you are, so this row would be a second
        control for the same thing.
      */}
      {allStaff.length > 1 && (
        <div
          className="mt-5 hidden items-center gap-2 overflow-x-auto pb-1 sm:flex sm:flex-wrap sm:overflow-x-visible sm:pb-0"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}
        >
          <Link
            href={navUrl(view, baseDate, [])}
            aria-current={!filtering ? "true" : undefined}
            className={`shrink-0 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
              !filtering
                ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            Wszyscy
          </Link>

          {staffStats.map((s) => {
            const picked = selectedIds.includes(s.id);
            return (
              <Link
                key={s.id}
                href={toggleStaffUrl(s.id)}
                aria-current={picked ? "true" : undefined}
                title={picked ? `Ukryj ${s.name}` : `Pokaż ${s.name}`}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                  picked
                    ? "text-zinc-100"
                    : filtering
                    ? "border-zinc-800/60 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
                    : "border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                }`}
                style={picked ? { borderColor: s.color, backgroundColor: `${s.color}1a` } : undefined}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full transition-opacity"
                  style={{ backgroundColor: s.color, opacity: filtering && !picked ? 0.4 : 1 }}
                />
                {s.name}
                {s.count > 0 && (
                  <span className="font-mono text-xs text-zinc-500">{s.count}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        {view === "dzien" && <DayView date={baseDate} active={active} visibleStaff={visibleStaff} allStaff={allStaff} hours={hours} today={today} adminBase={adminBase} services={services} />}
        {view === "tydzien" && <WeekView startDate={startDate} active={active} visibleStaff={visibleStaff} allStaff={allStaff} today={today} navUrl={navUrl} />}
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
  hours,
  today,
  adminBase,
  services,
}: {
  date: string;
  active: Awaited<ReturnType<typeof getBookingsBetween>>;
  visibleStaff: { id: string; name: string; color: string }[];
  allStaff: { id: string; name: string; color: string }[];
  hours: Awaited<ReturnType<typeof getBusinessHours>>;
  today: string;
  adminBase: string;
  services: ServiceOption[];
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

  /** Height of one 30-minute row, in px. Bookings are sized against this. */
  const ROW_H = 36;

  /**
   * Where each booking sits in the grid.
   *
   * A booking claims the row containing its start plus every row it runs into,
   * via rowSpan — so an hour-long lesson reads as one block covering 11:00
   * through 12:00 instead of a card followed by a leftover stub. Within that
   * cell the block is positioned from the real start and sized from the real
   * duration, so a 45-minute service covers exactly a row and a half and a
   * booking starting off the half-hour still lands in the right place.
   */
  type CellPlan =
    | {
        kind: "start";
        booking: (typeof dayBookings)[number];
        span: number;
        offsetMin: number;
        durationMin: number;
      }
    | { kind: "covered" };

  const planKey = (staffId: string, slotMin: number) => `${staffId}@${slotMin}`;
  const cellPlans = new Map<string, CellPlan>();

  for (const b of dayBookings) {
    if (!b.staff_id) continue;
    // Clamp to opening hours so a booking spilling past close can't rowSpan
    // beyond the last rendered row.
    const bStart = Math.max(warsawMinutes(b.starts_at), startMin);
    const bEnd = Math.min(warsawMinutes(b.ends_at), endMin);
    if (bEnd <= bStart) continue;

    const firstSlot = startMin + Math.floor((bStart - startMin) / 30) * 30;
    const span = Math.max(1, Math.ceil((bEnd - firstSlot) / 30));

    cellPlans.set(planKey(b.staff_id, firstSlot), {
      kind: "start",
      booking: b,
      span,
      offsetMin: bStart - firstSlot,
      durationMin: bEnd - bStart,
    });
    for (let k = 1; k < span; k++) {
      cellPlans.set(planKey(b.staff_id, firstSlot + k * 30), { kind: "covered" });
    }
  }

  const isToday = date === today;

  return (
    <DayStaffCarousel staff={visibleStaff}>
      {/* width:100% + minWidth keeps both ends working: with many staff the
          table exceeds the container and scrolls at ~180px per column; with
          one or two it stretches to fill instead of leaving the page empty.
          Staff columns carry no width so `table-layout: fixed` splits the
          remaining space between them evenly. */}
      {/* --sched-col-w is set by DayStaffCarousel on phones, where each column
          is widened to fill the screen; on desktop it is unset and the 180px
          fallback applies exactly as before. */}
      <table
        className="border-collapse text-sm"
        style={{
          tableLayout: "fixed",
          width: "100%",
          minWidth: `calc(64px + ${visibleStaff.length} * var(--sched-col-w, 180px))`,
        }}
      >
        <thead>
          <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
            <th
              className="sticky left-0 z-10 bg-zinc-900/60 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
              style={{ width: 64 }}
            >
              Godz.
            </th>
            {visibleStaff.length > 0 ? visibleStaff.map((s) => (
              <th
                key={s.id}
                data-staff-id={s.id}
                className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider"
                // scrollMarginLeft keeps the snap point clear of the sticky
                // hour gutter — without it the column lands underneath it.
                style={{
                  color: s.color,
                  scrollSnapAlign: "var(--sched-snap, none)" as string,
                  scrollMarginLeft: 64,
                }}
              >
                {s.name}
              </th>
            )) : (
              <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Rezerwacje</th>
            )}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, i) => (
            <tr
              key={slot.label}
              style={{ height: ROW_H }}
              className={`border-b border-zinc-800/30 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/10"}`}
            >
              <td
                className={`sticky left-0 z-10 px-3 py-1 align-top ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/95"}`}
              >
                <span className={`font-mono text-xs ${isToday ? "text-zinc-500" : "text-zinc-600"}`}>{slot.label}</span>
              </td>
              {visibleStaff.length > 0 ? visibleStaff.map((s) => {
                const plan = cellPlans.get(planKey(s.id, slot.min));

                // This row is inside a booking that started earlier — its cell
                // was already consumed by that booking's rowSpan.
                if (plan?.kind === "covered") return null;

                if (plan?.kind === "start") {
                  const blockH = Math.max(20, (plan.durationMin / 30) * ROW_H - 6);
                  return (
                    <td key={s.id} rowSpan={plan.span} className="relative align-top">
                      <div
                        className="absolute inset-x-2"
                        style={{ top: (plan.offsetMin / 30) * ROW_H + 3, height: blockH }}
                      >
                        <DayBookingCard
                          booking={toModalBooking(plan.booking)}
                          allStaff={allStaff}
                          timeLabel={`${formatWarsawTime(plan.booking.starts_at)} – ${formatWarsawTime(plan.booking.ends_at)}`}
                          color={s.color}
                          // Under ~45 minutes the third line would be squeezed
                          // to the point of being unreadable.
                          compact={blockH < 44}
                        />
                      </div>
                    </td>
                  );
                }

                return (
                  <td key={s.id} className="px-2 py-1 align-top">
                    <NewBookingButton
                      services={services}
                      allStaff={allStaff}
                      date={date}
                      time={slot.label}
                      presetStaffId={s.id}
                      className="block h-7 w-full rounded hover:bg-zinc-800/40"
                    >
                      <span className="sr-only">{`Dodaj rezerwację ${slot.label}, ${s.name}`}</span>
                    </NewBookingButton>
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
                    <NewBookingButton
                      services={services}
                      allStaff={allStaff}
                      date={date}
                      time={slot.label}
                      presetStaffId={null}
                      className="block h-7 w-full rounded hover:bg-zinc-800/40"
                    >
                      <span className="sr-only">{`Dodaj rezerwację ${slot.label}`}</span>
                    </NewBookingButton>
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
    </DayStaffCarousel>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────
function WeekView({
  startDate,
  active,
  visibleStaff,
  allStaff,
  today,
  navUrl,
}: {
  startDate: string;
  active: Awaited<ReturnType<typeof getBookingsBetween>>;
  visibleStaff: { id: string; name: string; color: string }[];
  allStaff: { id: string; name: string; color: string }[];
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
      {/* See the day view above for why width/minWidth are paired this way. */}
      <table
        className="border-collapse text-sm"
        style={{ tableLayout: "fixed", width: "100%", minWidth: 112 + visibleStaff.length * 200 }}
      >
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

