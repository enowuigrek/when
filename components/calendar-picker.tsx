"use client";

import Link from "next/link";
import { useState } from "react";

type Day = {
  date: string; // YYYY-MM-DD
  closed: boolean;
};

const MONTH_PL = [
  "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
  "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień",
];
const DOW_PL = ["Pn","Wt","Śr","Cz","Pt","Sb","Nd"];

function isoYM(dateStr: string): { year: number; month: number } {
  const [y, m] = dateStr.split("-").map(Number);
  return { year: y, month: m };
}

function ymKey(year: number, month: number) {
  return year * 100 + month;
}

function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function buildGrid(year: number, month: number): string[] {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const pad = (n: number) => String(n).padStart(2, "0");
  const cells: string[] = [];

  for (let i = offset - 1; i >= 0; i--)
    cells.push(`${prevYear}-${pad(prevMonth)}-${pad(prevDays - i)}`);

  for (let d = 1; d <= daysInMonth; d++)
    cells.push(`${year}-${pad(month)}-${pad(d)}`);

  const tail = 42 - cells.length;
  for (let d = 1; d <= tail; d++)
    cells.push(`${nextYear}-${pad(nextMonth)}-${pad(d)}`);

  return cells;
}

type CalendarPickerProps = {
  /** Required for date-pick mode (booking flow). Optional in week mode. */
  days?: Day[];
  selectedDate?: string;
  today: string;

  // ── Date-pick mode ───────────────────────────────────────────────────────
  /** Click handler for a single date (booking flow). */
  onPick?: (date: string) => void;
  /** Per-date href for rendering cells as Next <Link> (e.g. harmonogram month). */
  hrefMap?: Record<string, string>;
  /** Per-date badge text (e.g. booking count) shown in top-right of the cell. */
  badges?: Record<string, string | number>;

  // ── Week-pick mode ──────────────────────────────────────────────────────
  /** Highlight whole rows on hover, click navigates to that week. */
  weekMode?: boolean;
  /** Monday ISO of the week the user is currently viewing — strong accent fill. */
  viewedWeekStart?: string;
  /** Monday ISO of today's week — subtle marker (so user always knows where "now" is). */
  currentWeekStart?: string;
  /** Builds the URL for a Monday ISO; cells become <Link>s using this. */
  weekHrefFor?: (monday: string) => string;

  // ── Layout ──────────────────────────────────────────────────────────────
  /**
   * Externally control which month is displayed. When set, the internal prev/next
   * header is hidden — the parent provides its own navigation.
   */
  displayYearMonth?: { year: number; month: number };
  /** "md" (default) — booking flow.  "sm" — sidebars / week pickers. */
  size?: "md" | "sm";
};

export function CalendarPicker({
  days = [],
  selectedDate,
  today,
  onPick,
  hrefMap,
  badges,
  weekMode = false,
  viewedWeekStart,
  currentWeekStart,
  weekHrefFor,
  displayYearMonth,
  size = "md",
}: CalendarPickerProps) {
  const daysMap = new Map(days.map((d) => [d.date, d]));
  const todayYM = isoYM(today);

  // Initial display: viewed-week's month in week mode, else today.
  const initialYM = displayYearMonth
    ? displayYearMonth
    : weekMode && viewedWeekStart
    ? isoYM(viewedWeekStart)
    : todayYM;

  const lastDay = days[days.length - 1]?.date ?? today;
  const lastYM = isoYM(lastDay);

  const controlled = !!displayYearMonth;
  const [calYear, setCalYear] = useState(initialYM.year);
  const [calMonth, setCalMonth] = useState(initialYM.month);
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);

  const year = controlled ? displayYearMonth!.year : calYear;
  const month = controlled ? displayYearMonth!.month : calMonth;

  // Week mode browses freely (past + future). Date-pick mode stays bounded.
  const canPrev = weekMode ? true : ymKey(year, month) > ymKey(todayYM.year, todayYM.month);
  const canNext = weekMode ? true : ymKey(year, month) < ymKey(lastYM.year, lastYM.month);

  function prevMonth() {
    if (controlled || !canPrev) return;
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (controlled || !canNext) return;
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  }

  const cells = buildGrid(year, month);
  const pad = (n: number) => String(n).padStart(2, "0");
  const currentMonthPrefix = `${year}-${pad(month)}-`;

  // ── Sizing ──────────────────────────────────────────────────────────────
  const isSm = size === "sm";
  const wrapperPad = isSm ? "p-3" : "p-4";
  const cellH = isSm ? "h-8" : "h-10";
  const headerMb = isSm ? "mb-3" : "mb-4";
  const headerBtn = isSm ? "h-7 w-7 text-sm" : "h-8 w-8";
  const headerLabel = isSm ? "text-xs" : "text-sm";
  const dowPad = isSm ? "py-0.5 text-[10px]" : "py-1 text-xs";
  const cellText = isSm ? "text-xs" : "text-sm";

  return (
    <div className={`rounded-xl border border-zinc-800/60 bg-zinc-900/40 ${wrapperPad} select-none`}>
      {/* Header — hidden when month is externally controlled */}
      {!controlled && (
        <div className={`${headerMb} flex items-center justify-between`}>
          <button
            type="button"
            onClick={prevMonth}
            disabled={!canPrev}
            className={`${headerBtn} flex items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30`}
          >
            ‹
          </button>
          <span className={`${headerLabel} font-medium text-zinc-200`}>
            {MONTH_PL[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            disabled={!canNext}
            className={`${headerBtn} flex items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30`}
          >
            ›
          </button>
        </div>
      )}

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DOW_PL.map((d) => (
          <div key={d} className={`${dowPad} font-medium uppercase tracking-wider text-zinc-600`}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const isCurrentMonth = date.startsWith(currentMonthPrefix);
          const isToday = date === today;
          const dayLabel = date.split("-")[2].replace(/^0/, "");

          // ── Week mode: every cell participates, even other-month and past ─
          if (weekMode) {
            const cellWeek = mondayOf(date);
            const isViewedWeek = !!viewedWeekStart && cellWeek === viewedWeekStart;
            const isCurrentWeek = !!currentWeekStart && cellWeek === currentWeekStart;
            const isHoveredWeek = hoveredWeek === cellWeek;

            let cls =
              `relative flex ${cellH} w-full items-center justify-center rounded-md ${cellText} font-medium transition-colors `;
            if (isViewedWeek) {
              cls += "bg-[var(--color-accent)]/90 text-[var(--color-accent-fg)] ";
            } else if (isHoveredWeek) {
              cls += "bg-zinc-800/60 text-zinc-200 ";
            } else if (isCurrentMonth) {
              cls += "text-zinc-300 ";
            } else {
              cls += "text-zinc-600 ";
            }

            const todayDotEl = isToday && !isViewedWeek ? (
              <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-accent)]" />
            ) : null;
            // "current week" marker — subtle 2px accent line under the row,
            // hidden when this row is the actively-viewed one (it'd be
            // redundant with the strong fill).
            const currentWeekMark = isCurrentWeek && !isViewedWeek ? (
              <span className="pointer-events-none absolute inset-x-1 bottom-0 h-[2px] rounded-full bg-[var(--color-accent)]/60" />
            ) : null;

            const href = weekHrefFor ? weekHrefFor(cellWeek) : undefined;
            const inner = (
              <>
                {currentWeekMark}
                {todayDotEl}
                {dayLabel}
              </>
            );

            if (href) {
              return (
                <Link
                  key={date}
                  href={href}
                  className={cls}
                  onMouseEnter={() => setHoveredWeek(cellWeek)}
                  onMouseLeave={() => setHoveredWeek((w) => (w === cellWeek ? null : w))}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={date}
                type="button"
                className={cls}
                onMouseEnter={() => setHoveredWeek(cellWeek)}
                onMouseLeave={() => setHoveredWeek((w) => (w === cellWeek ? null : w))}
                onClick={() => onPick?.(cellWeek)}
              >
                {inner}
              </button>
            );
          }

          // ── Date-pick mode (booking, harmonogram month) ─────────────────
          const dayInfo = daysMap.get(date);
          const isSelected = !!selectedDate && date === selectedDate;
          const isAvailable = !!dayInfo && !dayInfo.closed;
          const isClosed = !!dayInfo && dayInfo.closed;
          const badge = isAvailable && badges ? badges[date] : undefined;
          const href = isAvailable && hrefMap ? hrefMap[date] : undefined;

          // Other-month days: invisible filler, no interaction
          if (!isCurrentMonth) {
            return (
              <div
                key={date}
                className={`flex ${cellH} w-full items-center justify-center rounded-lg ${cellText} text-zinc-800/50`}
              >
                {dayLabel}
              </div>
            );
          }

          let cls =
            `relative flex ${cellH} w-full items-center justify-center rounded-lg ${cellText} font-medium transition-all `;
          if (isSelected) {
            cls += "bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-sm cursor-pointer";
          } else if (isAvailable) {
            cls += "cal-day-available cursor-pointer";
          } else if (isClosed) {
            cls += "text-zinc-700 cursor-not-allowed opacity-40";
          } else {
            cls += "text-zinc-700/50 cursor-default font-normal";
          }

          const todayDot = isToday && !isSelected ? (
            <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-accent)]" />
          ) : null;
          const badgeNode = badge ? (
            <span className="pointer-events-none absolute right-1 top-1 rounded-full bg-zinc-800 px-1 font-mono text-[10px] leading-none py-0.5 text-zinc-300">
              {badge}
            </span>
          ) : null;

          if (href) {
            return (
              <Link key={date} href={href} className={cls}>
                {todayDot}
                {badgeNode}
                {dayLabel}
              </Link>
            );
          }

          return (
            <button
              key={date}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onPick?.(date)}
              className={cls}
            >
              {todayDot}
              {badgeNode}
              {dayLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
