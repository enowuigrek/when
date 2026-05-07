"use client";

import Link from "next/link";
import { CalendarPicker } from "@/components/calendar-picker";

function addDays(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}

function fmt(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return `${String(day).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

type Props = {
  /** Monday of the week being viewed. */
  weekStart: string;
  /** Monday of "today's" week. */
  todayMonday: string;
  /** Today's date (for the in-cell dot indicator). */
  today: string;
  /** Selected single staff (for sidebar editor). Preserved across navigation. */
  staffParam?: string;
  /** Comma-separated list of staff visible in the table. Preserved across navigation. */
  pracownicyParam?: string;
};

export function GrafikWeekPicker({
  weekStart,
  todayMonday,
  today,
  staffParam,
  pracownicyParam,
}: Props) {
  const weekEnd = addDays(weekStart, 6);
  const prev = addDays(weekStart, -7);
  const next = addDays(weekStart, 7);
  const isCurrent = weekStart === todayMonday;

  function buildHref(monday: string) {
    const params = new URLSearchParams();
    params.set("tydzien", monday);
    if (staffParam) params.set("pracownik", staffParam);
    if (pracownicyParam) params.set("pracownicy", pracownicyParam);
    return `/admin/grafik?${params.toString()}`;
  }

  return (
    <div className="space-y-3">
      <CalendarPicker
        today={today}
        weekMode
        size="sm"
        viewedWeekStart={weekStart}
        currentWeekStart={todayMonday}
        weekHrefFor={buildHref}
      />

      {/* Prev / range / next / Today — under the calendar */}
      <div className="flex items-center gap-1.5">
        <Link
          href={buildHref(prev)}
          aria-label="Poprzedni tydzień"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          ←
        </Link>
        <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-center font-mono text-[11px] text-zinc-300">
          {fmt(weekStart)} <span className="text-zinc-600">–</span> {fmt(weekEnd)}
        </div>
        <Link
          href={buildHref(next)}
          aria-label="Następny tydzień"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          →
        </Link>
        {!isCurrent && (
          <Link
            href={buildHref(todayMonday)}
            className="flex h-8 items-center rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            Dziś
          </Link>
        )}
      </div>
    </div>
  );
}
