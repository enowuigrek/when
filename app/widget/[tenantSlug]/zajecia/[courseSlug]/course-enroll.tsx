"use client";

import { useState } from "react";
import { CalendarPicker } from "@/components/calendar-picker";
import { EnrollForm } from "./enroll-form";

export type CourseDay = {
  groupId: string;
  dayOfWeek: number;
  /** "15:45–17:15" */
  time: string;
  ageLabel: string | null;
  min: number | null;
  max: number | null;
  taken: number;
};

const WEEKDAY = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}
function human(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/**
 * Choosing when the month starts.
 *
 * The calendar only lights the days this course runs on, so the question is
 * "which of our days, and from when" rather than "pick any date and find out
 * afterwards whether anything happens on it".
 */
export function CourseEnroll({
  tenantSlug,
  days,
  today,
  karnet,
  words,
  color,
}: {
  tenantSlug: string;
  days: CourseDay[];
  today: string;
  karnet: { lessons: number; pricePln: number } | null;
  words: { enrollee: string; guardian: string | null; action: string };
  /** The course's colour, which its days are lit in. */
  color: string;
}) {
  const [startDate, setStartDate] = useState<string | null>(null);

  const weekdays = [...new Set(days.map((d) => d.dayOfWeek))];
  // Eight weeks: as far as a month's karnet reaches plus room to start later.
  const calendar: { date: string; closed: boolean }[] = [];
  for (let i = 0; i < 56; i++) {
    const date = addDays(today, i);
    calendar.push({ date, closed: !weekdays.includes(weekdayOf(date)) });
  }

  const picked = startDate ? days.find((d) => d.dayOfWeek === weekdayOf(startDate)) : null;
  const lessons = karnet?.lessons ?? 1;
  const planned = startDate
    ? Array.from({ length: lessons }, (_, i) => addDays(startDate, i * 7))
    : [];

  if (!startDate) {
    return (
      <div className="mt-6">
        <h2 className="text-sm font-medium text-zinc-200">Od kiedy zaczynamy?</h2>
        <p className="mt-1 mb-4 text-sm text-zinc-500">
          Podświetlone są dni, w które te zajęcia się odbywają.
        </p>

        <ul className="mb-4 flex flex-wrap gap-2">
          {days.map((d) => (
            <li
              key={d.groupId}
              className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
            >
              <p className="text-xs text-zinc-300">{WEEKDAY[d.dayOfWeek]}</p>
              <p className="font-mono text-xs text-zinc-400">{d.time}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {d.max != null && d.taken >= d.max
                  ? "brak miejsc"
                  : d.min != null && d.taken < d.min
                    ? `zbieramy grupę — ${d.taken} z ${d.min}`
                    : `zapisanych ${d.taken}`}
              </p>
            </li>
          ))}
        </ul>

        <CalendarPicker
          days={calendar}
          selectedDate={undefined}
          today={today}
          markColors={Object.fromEntries(weekdays.map((d) => [d, [color]]))}
          onPick={(d) => setStartDate(d)}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-zinc-200">
          Start: {human(startDate)}
          {picked && (
            <span className="ml-2 font-mono text-xs text-zinc-500">{picked.time}</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setStartDate(null)}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Zmień dzień
        </button>
      </div>

      {karnet && (
        <div className="mb-4 rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-5 py-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Zapis obejmuje te spotkania
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {planned.map((d, i) => (
              <li key={d} className="flex items-baseline gap-2 text-sm text-zinc-300">
                <span className="font-mono text-xs text-zinc-600">
                  {i + 1}/{planned.length}
                </span>
                {human(d)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {picked ? (
        <EnrollForm
          tenantSlug={tenantSlug}
          groupSlug={picked.groupId}
          startDate={startDate}
          karnet={karnet}
          trialLabel={`jedno spotkanie — ${human(startDate)}`}
          words={words}
        />
      ) : (
        <p className="text-sm text-red-400">W ten dzień te zajęcia się nie odbywają.</p>
      )}
    </div>
  );
}
