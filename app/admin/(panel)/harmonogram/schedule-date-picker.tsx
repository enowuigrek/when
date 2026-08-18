"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPicker } from "@/components/calendar-picker";

type Props = {
  /** Which mode the calendar picks in. */
  view: "dzien" | "tydzien";
  today: string;
  /** Selected day (day view) or any day inside the selected week. */
  baseDate: string;
  /** Monday of the viewed week, for week mode. */
  weekStart: string;
  /** Monday of this week, so "current" can be marked. */
  todayWeekStart: string;
  /** date → href. Precomputed: a server component cannot hand over a function. */
  dayHref: Record<string, string>;
  /** Monday → href, same reason. */
  weekHref: Record<string, string>;
  todayHref: string;
  /** Bookings per day, shown on the calendar cells. */
  badges: Record<string, number>;
  /** Days outside opening hours, greyed out. */
  days: { date: string; closed: boolean }[];
};

function addDays(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}

const DOW = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

/**
 * Date navigation for the schedule.
 *
 * Replaces prev/next arrows: stepping a day at a time is fine for tomorrow and
 * useless for a fortnight out. The calendar also absorbs what the month view
 * used to be — it only ever showed bookings per day, which is what the badges
 * carry now.
 *
 * Split by breakpoint rather than by measurement, since only layout differs:
 * a full month grid is worth its space on a desktop, but on a phone it would
 * push the actual schedule below the fold, so there it starts as one week and
 * opens on demand.
 */
export function ScheduleDatePicker({
  view,
  today,
  baseDate,
  weekStart,
  todayWeekStart,
  dayHref,
  weekHref,
  todayHref,
  badges,
  days,
}: Props) {
  const [open, setOpen] = useState(false);

  const calendarFor = (size: "sm" | "md") => (
    <CalendarPicker
      today={today}
      days={days}
      badges={badges}
      size={size}
      allowPastNav
      {...(view === "tydzien"
        ? {
            weekMode: true,
            viewedWeekStart: weekStart,
            currentWeekStart: todayWeekStart,
            weekHrefFor: (monday: string) => weekHref[monday] ?? todayHref,
          }
        : { selectedDate: baseDate, hrefMap: dayHref })}
    />
  );

  const isOnToday = view === "tydzien" ? weekStart === todayWeekStart : baseDate === today;

  // The week containing whatever is selected — the phone's default surface.
  const stripStart = view === "tydzien" ? weekStart : (() => {
    const [y, m, d] = baseDate.split("-").map(Number);
    const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Mon = 0
    return addDays(baseDate, -dow);
  })();

  return (
    <div className="w-full sm:w-auto">
      {/* Phone: one week visible at all times, month on request. */}
      <div className="sm:hidden">
        <div className="flex items-center gap-1">
          {Array.from({ length: 7 }, (_, i) => addDays(stripStart, i)).map((d, i) => {
            const sel = view === "tydzien" ? true : d === baseDate;
            const isToday = d === today;
            const n = badges[d] ?? 0;
            return (
              <Link
                key={d}
                href={(view === "tydzien" ? weekHref[stripStart] : dayHref[d]) ?? todayHref}
                className={`flex flex-1 flex-col items-center rounded-lg border py-1.5 transition-colors ${
                  sel && view === "dzien"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <span className="text-[10px] uppercase text-zinc-600">{DOW[i]}</span>
                <span className={`font-mono text-sm ${isToday ? "text-[var(--color-accent)]" : "text-zinc-300"}`}>
                  {Number(d.slice(8, 10))}
                </span>
                <span className={`mt-0.5 h-1 w-1 rounded-full ${n > 0 ? "bg-zinc-500" : "bg-transparent"}`} />
              </Link>
            );
          })}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            {open ? "Zwiń kalendarz" : "Wybierz z kalendarza"}
          </button>
          {!isOnToday && (
            <Link
              href={todayHref}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Dziś
            </Link>
          )}
        </div>

        {open && <div className="mt-3">{calendarFor("sm")}</div>}
      </div>

      {/* Desktop: the month is worth its space. */}
      <div className="hidden sm:block">
        {/* Inline width: seven 40px cells plus padding. An arbitrary Tailwind
            width was not being generated here, and this is one fixed number. */}
        <div style={{ width: 320 }}>{calendarFor("md")}</div>
        {!isOnToday && (
          <Link
            href={todayHref}
            className="mt-2 inline-block rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
          >
            Dziś
          </Link>
        )}
      </div>
    </div>
  );
}
