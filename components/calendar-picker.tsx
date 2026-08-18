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
const MONTH_PL_SHORT = [
  "Sty","Lut","Mar","Kwi","Maj","Cze",
  "Lip","Sie","Wrz","Paź","Lis","Gru",
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
  const dow = dt.getUTCDay();
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
  days?: Day[];
  selectedDate?: string;
  today: string;

  // Date-pick mode (booking flow)
  onPick?: (date: string) => void;
  hrefMap?: Record<string, string>;
  badges?: Record<string, string | number>;

  // Week-pick mode (grafik)
  weekMode?: boolean;
  viewedWeekStart?: string;
  currentWeekStart?: string;
  weekHrefFor?: (monday: string) => string;

  // Layout
  displayYearMonth?: { year: number; month: number };
  size?: "md" | "sm";
  /**
   * Allow stepping into months before the current one (off by default).
   * Booking flows lock to the present; admin browsing pages enable this.
   */
  allowPastNav?: boolean;
  /**
   * How the picked day is marked.
   *
   * "solid" — filled accent. The booking flow's confirmation that this is the
   *   date you chose.
   * "soft"  — accent tint plus a ring, matching how week mode marks a week.
   *   The ring is what a single cell needs and a seven-cell band does not:
   *   the band is found by its shape, one tinted square is not.
   */
  selectionTone?: "solid" | "soft";
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
  allowPastNav = false,
  selectionTone = "solid",
}: CalendarPickerProps) {
  const daysMap = new Map(days.map((d) => [d.date, d]));
  const todayYM = isoYM(today);

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
  const [pickerView, setPickerView] = useState<"days" | "months">("days");

  const year = controlled ? displayYearMonth!.year : calYear;
  const month = controlled ? displayYearMonth!.month : calMonth;

  const canPrev = weekMode || allowPastNav ? true : ymKey(year, month) > ymKey(todayYM.year, todayYM.month);
  const canNext = weekMode || allowPastNav ? true : ymKey(year, month) < ymKey(lastYM.year, lastYM.month);

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

  // Sizing — bump up small mode on mobile (it's used in admin sidebars where
  // 32px cells fall below comfortable tap targets). At sm: breakpoint we
  // shrink back to the original compact size for desktop side panels.
  const isSm = size === "sm";
  const wrapperPad = isSm ? "p-3" : "p-4";
  const cellH = isSm ? "h-11 sm:h-8" : "h-11 sm:h-10";
  const headerMb = isSm ? "mb-3" : "mb-4";
  const headerBtn = isSm ? "h-10 w-10 sm:h-7 sm:w-7" : "h-10 w-10 sm:h-8 sm:w-8";
  const headerLabel = isSm ? "text-sm sm:text-xs" : "text-sm";
  const dowPad = isSm ? "py-1 text-[11px] sm:py-0.5 sm:text-[10px]" : "py-1 text-xs";
  const cellText = isSm ? "text-sm sm:text-xs" : "text-sm";

  const labelToggleable = !controlled;

  // ── Month picker view (overlay grid) ────────────────────────────────────
  function renderMonthPicker() {
    return (
      <div className="grid grid-cols-3 gap-1.5 py-1">
        {MONTH_PL_SHORT.map((label, idx) => {
          const m = idx + 1;
          const isCurrent = m === todayYM.month && year === todayYM.year;
          const isSelected = m === month;
          let cls = `flex h-9 items-center justify-center rounded-md ${cellText} font-medium transition-colors `;
          if (isSelected) cls += "bg-[var(--color-accent)] text-[var(--color-accent-fg)] ";
          else if (isCurrent) cls += "bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800 ";
          else cls += "text-zinc-300 hover:bg-zinc-800 ";
          return (
            <button
              key={m}
              type="button"
              onClick={() => { if (!controlled) { setCalMonth(m); } setPickerView("days"); }}
              className={cls}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-zinc-800/60 bg-zinc-900/40 ${wrapperPad} select-none`}>
      {/* Header */}
      {!controlled && (
        <div className={`${headerMb} flex items-center justify-between`}>
          <button
            type="button"
            onClick={() => {
              if (pickerView === "months") setCalYear((y) => y - 1);
              else prevMonth();
            }}
            disabled={pickerView === "days" && !canPrev}
            aria-label={pickerView === "months" ? "Poprzedni rok" : "Poprzedni miesiąc"}
            className={`${headerBtn} flex shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          {labelToggleable ? (
            <button
              type="button"
              onClick={() => setPickerView((v) => (v === "days" ? "months" : "days"))}
              className={`${headerLabel} flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-zinc-100`}
            >
              {pickerView === "months" ? year : `${MONTH_PL[month - 1]} ${year}`}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${pickerView === "months" ? "rotate-180" : ""}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          ) : (
            <span className={`${headerLabel} font-medium text-zinc-200`}>
              {MONTH_PL[month - 1]} {year}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (pickerView === "months") setCalYear((y) => y + 1);
              else nextMonth();
            }}
            disabled={pickerView === "days" && !canNext}
            aria-label={pickerView === "months" ? "Następny rok" : "Następny miesiąc"}
            className={`${headerBtn} flex shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {pickerView === "months" ? (
        renderMonthPicker()
      ) : (
        <>
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
            {(() => {
              const pad = (n: number) => String(n).padStart(2, "0");
              const currentMonthPrefix = `${year}-${pad(month)}-`;
              const cells = buildGrid(year, month);
              return cells.map((date, idx) => {
              const isCurrentMonth = date.startsWith(currentMonthPrefix);
              const isToday = date === today;
              const dayLabel = date.split("-")[2].replace(/^0/, "");

              // ── Week mode ──────────────────────────────────────────────
              if (weekMode) {
                const cellWeek = mondayOf(date);
                const isViewedWeek = !!viewedWeekStart && cellWeek === viewedWeekStart;
                const isCurrentWeek = !!currentWeekStart && cellWeek === currentWeekStart;
                const isHoveredWeek = hoveredWeek === cellWeek;

                let cls =
                  `relative flex ${cellH} w-full items-center justify-center ${cellText} font-medium transition-colors `;
                // Row tinting priority (current > viewed > hovered > base):
                //   - current week: strong accent fill (real "now" anchor)
                //   - viewed week:  soft sidebar-style gray (the row you're navigating to)
                //   - hovered:      slightly darker than viewed (preview)
                if (isCurrentWeek) {
                  // A tint rather than a solid fill: seven saturated cells
                  // shout, and the row only needs to read as "this is now".
                  cls += "bg-[var(--color-accent)]/15 text-[var(--color-accent)] ";
                } else if (isViewedWeek) {
                  cls += "bg-zinc-800 text-zinc-100 ";
                } else if (isHoveredWeek) {
                  cls += "bg-zinc-800 text-zinc-100 ";
                } else if (isCurrentMonth) {
                  cls += "text-zinc-300 ";
                } else {
                  cls += "text-zinc-600 ";
                }

                // Today is ringed, matching day mode. The old white dot was
                // hard-coded white to survive the solid accent fill, and against
                // a coloured row it read as a stray mark.
                const weekCellStyle = isToday
                  ? ({ boxShadow: "inset 0 0 0 1.5px var(--color-accent)" } as const)
                  : undefined;
                const todayDot = null;

                const href = weekHrefFor ? weekHrefFor(cellWeek) : undefined;
                const cellInner = (
                  <>
                    {todayDot}
                    <span>{dayLabel}</span>
                  </>
                );

                // Square the corners on the inside edges of a row so the row reads as one bar.
                // First col → round left, last col → round right.
                const col = idx % 7;
                const rowCorners = col === 0 ? "rounded-l-md" : col === 6 ? "rounded-r-md" : "";
                cls += rowCorners + " ";

                if (href) {
                  return (
                    <Link
                      key={date}
                      href={href}
                      className={cls}
                      style={weekCellStyle}
                      onMouseEnter={() => setHoveredWeek(cellWeek)}
                      onMouseLeave={() => setHoveredWeek((w) => (w === cellWeek ? null : w))}
                    >
                      {cellInner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={date}
                    type="button"
                    className={cls}
                    style={weekCellStyle}
                    onMouseEnter={() => setHoveredWeek(cellWeek)}
                    onMouseLeave={() => setHoveredWeek((w) => (w === cellWeek ? null : w))}
                    onClick={() => onPick?.(cellWeek)}
                  >
                    {cellInner}
                  </button>
                );
              }

              // ── Date-pick mode (booking, harmonogram month) ────────────
              const dayInfo = daysMap.get(date);
              const isSelected = !!selectedDate && date === selectedDate;
              const isAvailable = !!dayInfo && !dayInfo.closed;
              const isClosed = !!dayInfo && dayInfo.closed;
              const badge = isAvailable && badges ? badges[date] : undefined;
              const href = isAvailable && hrefMap ? hrefMap[date] : undefined;

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
                cls += selectionTone === "soft"
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] cursor-pointer"
                  : "bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-sm cursor-pointer";
              } else if (isAvailable) {
                cls += "cal-day-available cursor-pointer";
              } else if (isClosed) {
                cls += "text-zinc-700 cursor-not-allowed opacity-40";
              } else {
                cls += "text-zinc-700/50 cursor-default font-normal";
              }

              // Today reads as a ring around the number rather than a dot:
              // at these cell sizes a dot competes with the badge for the same
              // few pixels and ends up looking like a smudge.
              // Inline box-shadow, not a ring utility: Tailwind is not
              // generating ring-[var(--color-accent)] in this project, so the
              // class silently fell back to the default grey and today looked
              // like any other day.
              const ACCENT_RING = { boxShadow: "inset 0 0 0 1.5px var(--color-accent)" } as const;
              const cellStyle =
                (isSelected && selectionTone === "soft") || (isToday && !isSelected)
                  ? ACCENT_RING
                  : undefined;

              // The count sits under the number, not in the corner. As a
              // corner pill it overlapped the digit in anything but the
              // largest cells.
              const cellInner = (
                <span className="flex flex-col items-center justify-center leading-none">
                  <span>{dayLabel}</span>
                  {badge ? (
                    <span
                      className={`mt-0.5 font-mono text-[9px] leading-none ${
                        isSelected ? "text-[var(--color-accent-fg)]/70" : "text-zinc-500"
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </span>
              );

              if (href) {
                return (
                  <Link key={date} href={href} className={cls} style={cellStyle}>
                    {cellInner}
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
                  style={cellStyle}
                >
                  {cellInner}
                </button>
              );
              });
            })()}
          </div>
        </>
      )}
    </div>
  );
}
