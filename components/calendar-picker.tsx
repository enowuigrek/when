"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  size?: "md" | "sm" | "lg";
  /**
   * Allow stepping into months before the current one (off by default).
   * Booking flows lock to the present; admin browsing pages enable this.
   */
  allowPastNav?: boolean;
  /**
   * What the calendar is for, which decides how much every cell has to say.
   *
   * "picker" — choosing a date to book. Bookable days get a raised plate and
   *   closed ones are dimmed, because there the difference is a constraint.
   *   The chosen day is filled solid: confirmation that this is the one.
   *
   * "browse" — moving around the schedule. Every day is openable, so plates
   *   distinguish nothing and only add noise; cells stay flat and lift on
   *   hover, and the day you are on is filled the way the viewed week is.
   */
  variant?: "picker" | "browse";
};

/**
 * The mark for what is selected — the same one the navigation uses.
 *
 * A darkened cell with an accent rule along its bottom edge, which is how the
 * sidebar and the bottom bar show the section you are in. Pinned to the edge
 * and running nearly the full width, so it reads as part of the selected block
 * rather than as decoration under the number.
 *
 * `edgeToEdge` is for week mode, where seven of these sit side by side and
 * should join into one line under the row.
 */
function SelectedRule({ edgeToEdge = false }: { edgeToEdge?: boolean }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute bottom-0 h-0.5 bg-[var(--color-accent)] ${
        edgeToEdge ? "inset-x-0" : "inset-x-1 rounded-full"
      }`}
    />
  );
}


/** Relative luminance of an "rgb(r, g, b)" or "#rrggbb" colour. */
function luminance(color: string): number | null {
  let r: number, g: number, b: number;
  const hex = color.trim().match(/^#?([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  } else {
    const m = color.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return null;
    [r, g, b] = m.slice(0, 3).map(Number);
  }
  const f = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}

/** Selection fill for each theme — the value `bg-zinc-800` resolves to. */
const FILL = { light: "#d4d4d8", dark: "#27272a" } as const;

/**
 * Whether today can keep the accent colour when its cell is filled.
 *
 * Today is the accent everywhere else, and it should be here too — but the
 * accent belongs to the tenant, and a pale one on the light theme's grey fill
 * lands around 1.4:1. Rather than ban it outright (which turned a deep violet
 * into plain black for no reason) or allow it blindly, this measures the pair
 * once and lets the accent through when it is actually readable.
 */
function useAccentReadableOnFill(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Read from inside the tree, not from <html>: the tenant's accent is set
    // inline on the theme wrapper and inherits down. The root only carries the
    // stylesheet's default, so reading it there measures the wrong colour.
    const accent = getComputedStyle(el).getPropertyValue("--color-accent");
    const theme =
      document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const a = luminance(accent);
    const b = luminance(FILL[theme]);
    if (a === null || b === null) return;
    const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    setOk(contrast >= 4.5);
  }, []);

  return [ref, ok];
}

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
  variant = "picker",
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
  const [accentProbeRef, accentOnFill] = useAccentReadableOnFill();
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
  //
  // `lg` is for a calendar that fills a page column rather than sitting in a
  // rail. A cell there is over ninety pixels wide, and at the rail's 40px
  // height that reads as a row of flat bars rather than a calendar — the taller
  // cell keeps the proportion closer to square.
  const isSm = size === "sm";
  const isLg = size === "lg";
  const wrapperPad = isSm ? "p-3" : "p-4";
  const cellH = isSm ? "h-11 sm:h-8" : isLg ? "h-12 sm:h-14" : "h-11 sm:h-10";
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
    <div ref={accentProbeRef} className={`rounded-xl border border-zinc-800/60 bg-zinc-900/40 ${wrapperPad} select-none`}>
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

                // Weight set once, not layered: font-bold added after
                // font-medium loses to it, since both write font-weight and
                // the winner is decided by the stylesheet, not the class list.
                let cls =
                  `relative flex ${cellH} w-full items-center justify-center ${cellText} ${
                    isToday ? "font-bold" : "font-medium"
                  } transition-colors `;
                // Row tinting priority (current > viewed > hovered > base):
                //   - current week: strong accent fill (real "now" anchor)
                //   - viewed week:  soft sidebar-style gray (the row you're navigating to)
                //   - hovered:      slightly darker than viewed (preview)
                // Selection darkens the row and draws the rule beneath it.
                // Today is a colour, not a mark, so the two can sit on the
                // same cell without competing.
                const filled = isViewedWeek || isHoveredWeek;
                if (filled) cls += "bg-zinc-800 ";
                if (isToday && (!filled || accentOnFill)) {
                  cls += "text-[var(--color-accent)] ";
                } else if (filled) {
                  cls += "text-zinc-100 ";
                } else if (isCurrentMonth) {
                  cls += "text-zinc-300 ";
                } else {
                  cls += "text-zinc-600 ";
                }

                const href = weekHrefFor ? weekHrefFor(cellWeek) : undefined;
                const cellInner = (
                  <>
                    <span>{dayLabel}</span>
                    {isViewedWeek && <SelectedRule edgeToEdge />}
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
                `relative flex ${cellH} w-full items-center justify-center rounded-lg ${cellText} ${
                  isToday ? "font-bold" : "font-medium"
                } transition-all `;
              // Selected reads exactly as a chosen nav item does: the cell
              // darkens and an accent rule runs along its bottom edge. In the
              // booking flow the pick stays a solid accent fill — there it is
              // the answer to the question the page is asking, not a location.
              const solidPick = isSelected && variant !== "browse";
              if (isSelected) {
                cls += solidPick
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-sm cursor-pointer "
                  : "bg-zinc-800 cursor-pointer ";
              } else if (isAvailable) {
                cls += variant === "browse"
                  ? "hover:bg-zinc-800/60 cursor-pointer "
                  : "cal-day-available cursor-pointer ";
              } else if (isClosed) {
                cls += "cursor-not-allowed opacity-40 ";
              } else {
                cls += "cursor-default font-normal ";
              }

              // Today is bold and in the accent colour — the way the schedule
              // marks the current day in its own gutter. Not on a solid accent
              // fill, where accent on accent would disappear.
              // The solid pick in the booking flow keeps its own foreground:
              // accent on accent would vanish.
              if (isToday && (!isSelected || (accentOnFill && !solidPick))) {
                cls += "text-[var(--color-accent)] ";
              } else if (!isSelected && isAvailable) {
                cls += "text-zinc-300 ";
              } else if (!isSelected && isClosed) {
                cls += "text-zinc-700 ";
              } else if (!isSelected) {
                cls += "text-zinc-700/50 ";
              } else if (!solidPick) {
                cls += "text-zinc-100 ";
              }

              // The count sits under the number, not in the corner. As a
              // corner pill it overlapped the digit in anything but the
              // largest cells.
              // The number stays on the cell's centre line whether or not there
              // is a count under it. Stacking the two in a column moved every
              // day with bookings a few pixels up, so a month grid rippled
              // depending on which days were busy.
              const cellInner = (
                <>
                  <span className="leading-none">{dayLabel}</span>
                  {badge ? (
                    <span
                      className={`pointer-events-none absolute inset-x-0 bottom-[3px] text-center font-mono text-[9px] leading-none ${
                        isSelected && variant !== "browse"
                          ? "text-[var(--color-accent-fg)]/70"
                          : "text-zinc-500"
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                  {isSelected && variant === "browse" && <SelectedRule />}
                </>
              );

              if (href) {
                return (
                  <Link key={date} href={href} className={cls}>
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
