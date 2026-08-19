import Link from "next/link";
import { headers } from "next/headers";
import { getActiveStaff } from "@/lib/db/staff";
import { getBusinessHours } from "@/lib/db/services";
import {
  getAllStaffSchedules,
  getTimeOffInRange,
  getUpcomingTimeOff,
} from "@/lib/db/staff-schedule";
import { getBookingCountsByDay } from "@/lib/db/bookings";
import { warsawToday, addDays, mondayOfWeek, warsawDayBoundsUtc, formatShortDate } from "@/lib/slots";
import { calendarWindow } from "@/lib/calendar-window";
import { dayLabels } from "@/lib/business";
import { PageShell } from "@/components/ui/page-shell";
import { StaffChip } from "@/components/ui/staff-chip";
import { ScheduleDatePicker } from "../harmonogram/schedule-date-picker";
import { GrafikCell } from "./grafik-cell";
import { TimeOffPanel, type TimeOffEntry } from "./time-off-panel";

export const metadata = { title: "Grafik", robots: { index: false } };

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0] as const; // Mon → Sun

/** Frozen first column. Wider than the schedule's hour gutter, which only ever
 *  holds "14:30" — this one carries a weekday and a date. */
const GUTTER_W = 104;

export default async function GrafikPage({
  searchParams,
}: {
  searchParams: Promise<{ tydzien?: string; pracownik?: string; pracownicy?: string }>;
}) {
  const h = await headers();
  const demoSlug = h.get("x-demo-slug");
  const adminBase = demoSlug ? `/demo/${demoSlug}` : "/admin";

  const { tydzien, pracownik, pracownicy } = await searchParams;

  const today = warsawToday();
  const todayMonday = mondayOfWeek(today);
  const weekStart = tydzien && /^\d{4}-\d{2}-\d{2}$/.test(tydzien) ? mondayOfWeek(tydzien) : todayMonday;
  const weekEnd = addDays(weekStart, 6);

  const [staff, hours, allSchedules, timeOffWeek, upcoming] = await Promise.all([
    getActiveStaff(),
    getBusinessHours(),
    getAllStaffSchedules(),
    getTimeOffInRange(weekStart, weekEnd),
    getUpcomingTimeOff(today),
  ]);

  // Same filter contract as the schedule: no selection means everyone, and the
  // old single-value `pracownik` still resolves so older links keep working.
  const selectedIds = (pracownicy ?? pracownik ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((id) => staff.some((s) => s.id === id));
  const filtering = selectedIds.length > 0;
  const visibleStaff = filtering ? staff.filter((s) => selectedIds.includes(s.id)) : staff;

  function navUrl(week: string, ids: string[] = selectedIds) {
    const params = new URLSearchParams({ tydzien: week });
    if (ids.length) params.set("pracownicy", ids.join(","));
    return `${adminBase}/grafik?${params.toString()}`;
  }

  /** Add or drop one person; dropping the last one falls back to everyone. */
  function toggleStaffUrl(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    return navUrl(weekStart, next);
  }

  // ── Calendar, identical to the schedule's ─────────────────────────────────
  const { start: calStart, end: calEnd, days: calendarDays } = calendarWindow(weekStart);
  const weekHrefMap: Record<string, string> = {};
  for (const { date } of calendarDays) {
    const monday = mondayOfWeek(date);
    if (!weekHrefMap[monday]) weekHrefMap[monday] = navUrl(monday);
  }
  const dayCounts = await getBookingCountsByDay(
    warsawDayBoundsUtc(calStart).startIso,
    warsawDayBoundsUtc(calEnd).endIso
  );

  // ── Week rows ─────────────────────────────────────────────────────────────
  const weekDates = ORDERED_DAYS
    .map((dow, i) => ({ dow, date: addDays(weekStart, i) }))
    .filter(({ dow }) => !hours.find((h) => h.day_of_week === dow)?.closed);

  function bizHours(dow: number) {
    const h = hours.find((h) => h.day_of_week === dow);
    return {
      open: h?.open_time?.slice(0, 5) ?? null,
      close: h?.close_time?.slice(0, 5) ?? null,
      closed: h?.closed ?? true,
    };
  }

  function scheduleFor(staffId: string, dow: number) {
    return allSchedules.find((r) => r.staff_id === staffId && r.day_of_week === dow);
  }

  function timeOffOn(staffId: string, date: string) {
    return timeOffWeek.find((t) => t.staff_id === staffId && t.start_date <= date && t.end_date >= date);
  }

  // ── Panel data ────────────────────────────────────────────────────────────
  const byId = new Map(staff.map((s) => [s.id, s]));
  const panelEntries: TimeOffEntry[] = upcoming
    .filter((t) => visibleStaff.some((s) => s.id === t.staff_id))
    .map((t) => {
      const person = byId.get(t.staff_id);
      return {
        id: t.id,
        staffId: t.staff_id,
        staffName: person?.name ?? "—",
        staffColor: person?.color ?? "#71717a",
        type: t.type,
        startDate: t.start_date,
        endDate: t.end_date,
        note: t.note,
      };
    });

  const timeOffPanel = (
    <TimeOffPanel
      entries={panelEntries}
      soleStaff={visibleStaff.length === 1 ? visibleStaff[0] : null}
      visibleCount={visibleStaff.length}
      allStaff={staff}
      today={today}
    />
  );

  return (
    <PageShell
      title="Grafik"
      subtitle={`${formatShortDate(weekStart)} — ${formatShortDate(weekEnd)}`}
    >
      {/* Same split as the schedule: calendar in the rail, grid on the left,
          so switching between the two sections moves nothing on screen. */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="flex flex-col gap-4 lg:order-2 lg:w-[20rem] lg:shrink-0">
          {/* Sits exactly where the schedule keeps its Dzień/Tydzień switch, so
              the calendar below lands on the same line in both sections and the
              rail stops shifting when you move between them. Rather than pad
              the gap with nothing, it holds the one thing you reach for from
              here: the same week, seen as bookings instead of hours. */}
          <Link
            href={`${adminBase}/harmonogram?widok=tydzien&od=${weekStart}${
              filtering ? `&pracownicy=${selectedIds.join(",")}` : ""
            }`}
            className="self-start rounded-lg border border-zinc-800 p-1 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
          >
            <span className="block px-3.5 py-1">Rezerwacje w tym tygodniu →</span>
          </Link>

          <ScheduleDatePicker
            view="tydzien"
            today={today}
            baseDate={weekStart}
            weekStart={weekStart}
            todayWeekStart={todayMonday}
            dayHref={{}}
            weekHref={weekHrefMap}
            todayHref={navUrl(todayMonday)}
            badges={dayCounts}
            days={calendarDays}
          />

          {/* On a phone the rail stacks above the roster, and a full-height
              panel here would push the grid — the thing you came for — off the
              screen. So it moves below the grid there and keeps its place in
              the rail from lg up. */}
          <div className="hidden lg:block">{timeOffPanel}</div>
        </aside>

        <div className="min-w-0 lg:order-1 lg:flex-1">
          {/* Shown on phones as well, unlike the schedule's row: there the day
              view collapses into a one-person carousel whose strip of initials
              already does the jumping, so a chip row would be a second control
              for the same thing. The roster has no such carousel. */}
          {staff.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <StaffChip selected={!filtering} dimmed={filtering} href={navUrl(weekStart, [])}>
                Wszyscy
              </StaffChip>
              {staff.map((s) => (
                <StaffChip
                  key={s.id}
                  staff={s}
                  selected={selectedIds.includes(s.id)}
                  dimmed={filtering && !selectedIds.includes(s.id)}
                  href={toggleStaffUrl(s.id)}
                  title={selectedIds.includes(s.id) ? `Ukryj ${s.name}` : `Pokaż ${s.name}`}
                />
              ))}
            </div>
          )}

          <div
            // Unconditional mt-4, matching the schedule: with one person there
            // is no chip row on either page, and the gap has to survive its
            // absence or the two grids start at different heights.
            className="mt-4 overflow-x-auto rounded-xl border border-zinc-800/60"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}
          >
            <table
              className="border-collapse text-sm"
              style={{
                tableLayout: "fixed",
                width: "100%",
                minWidth: `calc(${GUTTER_W}px + ${Math.max(visibleStaff.length, 1)} * 180px)`,
              }}
            >
              <thead>
                <tr className="bg-zinc-900/60">
                  {/* Frozen on both axes, so it sits above the day gutter and
                      the header row alike — and opaque, since anything sliding
                      visibly underneath reads as a rendering fault. */}
                  <th
                    className="sticky left-0 top-0 z-30 border-b border-r border-dashed border-zinc-800/40 bg-zinc-900 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                    style={{ width: GUTTER_W }}
                  >
                    Dzień
                  </th>
                  {visibleStaff.map((s) => (
                    <th
                      key={s.id}
                      className="sticky top-0 z-10 border-b border-r border-dashed border-zinc-800/40 bg-zinc-900 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: s.color }}
                    >
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDates.map(({ dow, date }) => {
                  const biz = bizHours(dow);
                  const isToday = date === today;
                  const [, m, d] = date.split("-");
                  return (
                    <tr key={date} className="border-b border-dashed border-zinc-800/40">
                      <td className="sticky left-0 z-20 border-r border-dashed border-zinc-800/40 bg-zinc-950 px-3 py-2.5 align-top">
                        <p className={`text-sm font-medium ${isToday ? "text-[var(--color-accent)]" : "text-zinc-300"}`}>
                          {dayLabels[dow]}
                        </p>
                        <p className="font-mono text-xs text-zinc-600">
                          {d}.{m}
                        </p>
                      </td>
                      {visibleStaff.map((s) => (
                        <td key={s.id} className="border-r border-dashed border-zinc-800/40 px-2 py-2 align-top">
                          <GrafikCell
                            staffId={s.id}
                            staffColor={s.color}
                            dayOfWeek={dow}
                            dateStr={date}
                            scheduleRow={scheduleFor(s.id, dow)}
                            timeOff={timeOffOn(s.id, date)}
                            businessOpen={biz.open}
                            businessClose={biz.close}
                            allStaff={staff}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-zinc-600">
            Kliknij komórkę, żeby ustawić godziny pracy albo wpisać nieobecność. Puste pole = godziny z ustawień.
          </p>

          <div className="mt-6 lg:hidden">{timeOffPanel}</div>
        </div>
      </div>
    </PageShell>
  );
}
