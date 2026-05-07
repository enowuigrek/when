"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

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

function buildGrid(year: number, month: number): string[] {
  // First day of month (UTC)
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Sun
  // Polish week starts Monday → offset
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
  days: Day[];
  selectedDate?: string;
  today: string;
  /** Pick handler — used for client-side selection (e.g. booking flow). */
  onPick?: (date: string) => void;
  /** Alternative to onPick: render cells as Next <Link>. Used by the harmonogram month view. */
  getHref?: (date: string) => string;
  /** Optional content rendered in the top-right of each available cell (e.g. booking count badge). */
  renderBadge?: (date: string) => ReactNode;
  /**
   * Externally control which month is displayed. When set, the internal prev/next
   * header is hidden — the parent is expected to provide its own navigation.
   */
  displayYearMonth?: { year: number; month: number };
};

export function CalendarPicker({
  days,
  selectedDate,
  today,
  onPick,
  getHref,
  renderBadge,
  displayYearMonth,
}: CalendarPickerProps) {
  const daysMap = new Map(days.map((d) => [d.date, d]));
  const todayYM = isoYM(today);
  const lastDay = days[days.length - 1]?.date ?? today;
  const lastYM = isoYM(lastDay);

  const controlled = !!displayYearMonth;
  const [calYear, setCalYear] = useState(displayYearMonth?.year ?? todayYM.year);
  const [calMonth, setCalMonth] = useState(displayYearMonth?.month ?? todayYM.month);

  const year = controlled ? displayYearMonth!.year : calYear;
  const month = controlled ? displayYearMonth!.month : calMonth;

  const canPrev = ymKey(year, month) > ymKey(todayYM.year, todayYM.month);
  const canNext = ymKey(year, month) < ymKey(lastYM.year, lastYM.month);

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

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 select-none">
      {/* Header — hidden when month is externally controlled */}
      {!controlled && (
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            disabled={!canPrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-zinc-200">
            {MONTH_PL[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            disabled={!canNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ›
          </button>
        </div>
      )}

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DOW_PL.map((d) => (
          <div key={d} className="py-1 text-xs font-medium uppercase tracking-wider text-zinc-600">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const isCurrentMonth = date.startsWith(currentMonthPrefix);
          const dayInfo = daysMap.get(date);
          const isSelected = !!selectedDate && date === selectedDate;
          const isToday = date === today;
          const isAvailable = !!dayInfo && !dayInfo.closed;
          const isClosed = !!dayInfo && dayInfo.closed;
          const badge = isAvailable && renderBadge ? renderBadge(date) : null;

          // Other-month days: invisible filler, no interaction
          if (!isCurrentMonth) {
            return (
              <div
                key={date}
                className="flex h-10 w-full items-center justify-center rounded-lg text-sm text-zinc-800/50"
              >
                {date.split("-")[2].replace(/^0/, "")}
              </div>
            );
          }

          let cls =
            "relative flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ";
          if (isSelected) {
            cls += "bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-sm cursor-pointer";
          } else if (isAvailable) {
            cls += "cal-day-available cursor-pointer";
          } else if (isClosed) {
            cls += "text-zinc-700 cursor-not-allowed opacity-40";
          } else {
            // past or outside booking horizon
            cls += "text-zinc-700/50 cursor-default font-normal";
          }

          const dayLabel = date.split("-")[2].replace(/^0/, "");
          const todayDot = isToday && !isSelected ? (
            <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-accent)]" />
          ) : null;
          const badgeNode = badge ? (
            <span className="pointer-events-none absolute right-1 top-1 rounded-full bg-zinc-800 px-1 font-mono text-[10px] leading-none py-0.5 text-zinc-300">
              {badge}
            </span>
          ) : null;

          // Link mode (e.g. harmonogram month view)
          if (isAvailable && getHref) {
            return (
              <Link key={date} href={getHref(date)} className={cls}>
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
