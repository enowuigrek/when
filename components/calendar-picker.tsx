"use client";

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

export function CalendarPicker({
  days,
  selectedDate,
  onPick,
  today,
}: {
  days: Day[];
  selectedDate: string;
  onPick: (date: string) => void;
  today: string;
}) {
  const daysMap = new Map(days.map((d) => [d.date, d]));
  const todayYM = isoYM(today);
  const lastDay = days[days.length - 1]?.date ?? today;
  const lastYM = isoYM(lastDay);

  const [calYear, setCalYear] = useState(todayYM.year);
  const [calMonth, setCalMonth] = useState(todayYM.month);

  const canPrev = ymKey(calYear, calMonth) > ymKey(todayYM.year, todayYM.month);
  const canNext = ymKey(calYear, calMonth) < ymKey(lastYM.year, lastYM.month);

  function prevMonth() {
    if (!canPrev) return;
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (!canNext) return;
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  }

  const cells = buildGrid(calYear, calMonth);
  const pad = (n: number) => String(n).padStart(2, "0");
  const currentMonthPrefix = `${calYear}-${pad(calMonth)}-`;

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 select-none">
      {/* Header */}
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
          {MONTH_PL[calMonth - 1]} {calYear}
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
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const isAvailable = !!dayInfo && !dayInfo.closed;
          const isClosed = !!dayInfo && dayInfo.closed;

          // Other-month days: invisible filler, no interaction
          if (!isCurrentMonth) {
            return (
              <div
                key={date}
                className="flex h-9 w-full items-center justify-center rounded-lg text-sm text-zinc-800/50"
              >
                {date.split("-")[2].replace(/^0/, "")}
              </div>
            );
          }

          let cls =
            "relative flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ";
          if (isSelected) {
            cls += "bg-[var(--color-accent)] text-zinc-950 shadow-sm cursor-pointer";
          } else if (isAvailable) {
            cls += "cal-day-available cursor-pointer";
          } else if (isClosed) {
            cls += "text-zinc-700 cursor-not-allowed opacity-40";
          } else {
            // past or outside booking horizon
            cls += "text-zinc-700/50 cursor-default font-normal";
          }

          return (
            <button
              key={date}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onPick(date)}
              className={cls}
            >
              {isToday && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-accent)]" />
              )}
              {date.split("-")[2].replace(/^0/, "")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
