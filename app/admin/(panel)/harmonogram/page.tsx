import Link from "next/link";
import { headers } from "next/headers";
import { getBookingsBetween, getBookingCountsByDay } from "@/lib/db/bookings";
import { getActiveStaff } from "@/lib/db/staff";
import { getBusinessHours, getServices } from "@/lib/db/services";
import { DayBookingCard } from "./day-booking-card";
import { NewBookingButton, type ServiceOption } from "@/components/booking-create-modal";
import { StaffCarousel } from "@/components/schedule/staff-carousel";
import { ScheduleDatePicker } from "./schedule-date-picker";
import { DaySummary } from "./day-summary";
import { StaffChip } from "@/components/ui/staff-chip";
import { NoteBadge } from "@/components/ui/note-badge";
import { PageShell } from "@/components/ui/page-shell";
import { calendarWindow } from "@/lib/calendar-window";
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

  const { start: calWindowStart, end: calWindowEnd, days: calendarDays } = calendarWindow(baseDate);
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
    <PageShell title="Harmonogram" subtitle={periodLabel}>
      {/* Two columns from lg up. The calendar used to sit in the header, which
          left ~300px of dead space beside it and pushed the schedule past the
          half-way line of the screen — on a page that is now the panel's
          landing page. In a rail it costs the table some width, which it can
          afford since it scrolls sideways anyway, and buys back the vertical. */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="flex flex-col gap-4 lg:order-2 lg:w-[20rem] lg:shrink-0">
          {/* Sits over the calendar: both answer "which stretch of time am I
              looking at", so they belong to the same corner of the screen. */}
          <div className="flex items-center gap-1 self-start rounded-lg border border-zinc-800 p-1">
            {(["dzien", "tydzien"] as View[]).map((v) => (
              <Link
                key={v}
                href={navUrl(v, baseDate)}
                className={`rounded-md px-3.5 py-1 text-sm font-medium transition-colors ${
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
          <div className="hidden lg:block">
            <DaySummary bookings={active} view={view} now={new Date().toISOString()} />
          </div>
        </aside>

        <div className="min-w-0 lg:order-1 lg:flex-1">
          {/* Filter row, above the split so the rail and the grid start from the
              same edge. */}
          <div className="flex flex-wrap items-center gap-3">
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
              className="hidden items-center gap-2 sm:flex sm:flex-wrap"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}
            >
              <StaffChip selected={!filtering} dimmed={filtering} href={navUrl(view, baseDate, [])}>
                Wszyscy
              </StaffChip>

              {staffStats.map((s) => (
            <StaffChip
              key={s.id}
              staff={s}
              selected={selectedIds.includes(s.id)}
              dimmed={filtering && !selectedIds.includes(s.id)}
              count={s.count}
              href={toggleStaffUrl(s.id)}
              title={selectedIds.includes(s.id) ? `Ukryj ${s.name}` : `Pokaż ${s.name}`}
            />
          ))}
            </div>
          )}
          </div>



          <div className="mt-4">
            {view === "dzien" && <DayView date={baseDate} active={active} visibleStaff={visibleStaff} allStaff={allStaff} hours={hours} today={today} adminBase={adminBase} services={services} />}
            {view === "tydzien" && <WeekView startDate={startDate} active={active} visibleStaff={visibleStaff} allStaff={allStaff} today={today} navUrl={navUrl} />}
          </div>
        </div>
      </div>
    </PageShell>
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

  /**
   * Height of one 30-minute row, in px. Bookings are sized against this.
   *
   * 52 rather than 36 so the shortest common booking — half an hour — still
   * has room for time, name and service, the same three lines a longer one
   * gets. At 36 a half-hour block was 30px, which fitted two lines only by
   * putting the name beside the time and dropping the service entirely.
   */
  const ROW_H = 52;

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
    <StaffCarousel staff={visibleStaff} gutter={64}>
      {/* width:100% + minWidth keeps both ends working: with many staff the
          table exceeds the container and scrolls at ~180px per column; with
          one or two it stretches to fill instead of leaving the page empty.
          Staff columns carry no width so `table-layout: fixed` splits the
          remaining space between them evenly. */}
      {/* --sched-col-w is set by StaffCarousel on phones, where each column
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
              // Opaque, not bg-zinc-900/60: a frozen column that lets the
              // columns slide visibly underneath it looks like a rendering
              // fault. z-20 keeps it above the absolutely positioned bookings.
              // Corner cell: frozen on both axes, so it must sit above both
              // the row gutter (z-20) and the header row (z-10).
              className="sticky left-0 top-0 z-30 border-r border-dashed border-zinc-800/40 bg-zinc-900 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
              style={{ width: 64 }}
            >
              Godz.
            </th>
            {visibleStaff.length > 0 ? visibleStaff.map((s) => (
              <th
                key={s.id}
                data-staff-id={s.id}
                className="sticky top-0 z-10 border-r border-dashed border-zinc-800/40 bg-zinc-900 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider"
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
              // No zebra striping: the tint had no light-theme counterpart, so
              // it rendered as grey bars, and because later rows paint after
              // the row a booking starts in, those bars crossed the bookings
              // themselves. Dividing lines carry the rhythm on their own.
              className="border-b border-dashed border-zinc-800/40"
            >
              <td
                // One flat colour for the whole gutter rather than following
                // the row stripes: any alpha at all lets a booking show through
                // as it scrolls past.
                className="sticky left-0 z-20 border-r border-dashed border-zinc-800/40 bg-zinc-950 px-3 py-1 align-top"
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
                    <td key={s.id} rowSpan={plan.span} className="relative border-r border-dashed border-zinc-800/40 align-top">
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
                  <td key={s.id} className="relative border-r border-dashed border-zinc-800/40 p-0 align-top">
                    <NewBookingButton
                      services={services}
                      allStaff={allStaff}
                      date={date}
                      time={slot.label}
                      presetStaffId={s.id}
                      className="slot-empty absolute inset-0"
                    >
                      <span className="sr-only">{`Dodaj rezerwację ${slot.label}, ${s.name}`}</span>
                    </NewBookingButton>
                  </td>
                );
              }) : (
                <td className="relative p-0 align-top">
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
                      className="slot-empty absolute inset-0"
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
    </StaffCarousel>
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
    <StaffCarousel staff={visibleStaff} gutter={112} fitViewport={false}>
      {/* See the day view above for why width/minWidth are paired this way. */}
      <table
        className="border-collapse text-sm"
        style={{
          tableLayout: "fixed",
          width: "100%",
          minWidth: `calc(112px + ${visibleStaff.length} * var(--sched-col-w, 200px))`,
        }}
      >
        <thead>
          <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
            <th
              className="sticky left-0 top-0 z-30 border-r border-dashed border-zinc-800/40 bg-zinc-900 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
              style={{ width: 112 }}
            >
              Dzień
            </th>
            {visibleStaff.map((s) => (
              <th
                key={s.id}
                data-staff-id={s.id}
                className="sticky top-0 z-10 border-r border-dashed border-zinc-800/40 bg-zinc-900 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider"
                style={{ color: s.color, scrollSnapAlign: "var(--sched-snap, none)" as string, scrollMarginLeft: 112 }}
              >
                {s.name}
              </th>
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
              <tr key={d} className="border-b border-dashed border-zinc-800/40">
                <td className="sticky left-0 z-20 border-r border-dashed border-zinc-800/40 bg-zinc-950 px-4 py-3 align-top">
                  <Link href={navUrl("dzien", d)} className="block hover:opacity-70">
                    <p className={`font-medium ${isToday ? "text-[var(--color-accent)]" : "text-zinc-300"}`}>{dayLabels[dow]}</p>
                    <p className="font-mono text-xs text-zinc-600">{formatShortDate(d)}</p>
                    {totalForDay > 0 && <p className="mt-1 text-xs text-zinc-500">{totalForDay} rez.</p>}
                  </Link>
                </td>
                {visibleStaff.map((s) => {
                  const bookings = dayMap?.get(s.id) ?? [];
                  return (
                    <td key={s.id} className="border-r border-dashed border-zinc-800/40 px-3 py-3 align-top">
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
                                <div className="relative" style={{ backgroundColor: `${s.color}18`, borderLeft: `2px solid ${s.color}`, padding: "2px 6px", borderRadius: 4 }}>
                                  {b.notes && <NoteBadge note={b.notes} />}
                                  <p className="font-mono text-xs text-zinc-300">{formatWarsawTime(b.starts_at)}</p>
                                  <p className="pr-3 text-xs font-medium text-zinc-200">{b.customer_name}</p>
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
    </StaffCarousel>
  );
}

