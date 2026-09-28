"use client";

import { useState } from "react";
import Link from "next/link";
import { GroupEnrollForm, type EnrollWords } from "./group-enroll-form";
import type { SlotRow } from "../uslugi/slot-editor";
import { CalendarPicker } from "@/components/calendar-picker";
import { useAdminBase } from "@/lib/use-admin-base";

export type CourseSlot = SlotRow & {
  /** YYYY-MM-DD of the next time this slot meets. */
  nextDate: string;
  taken: number;
  names: string[];
};

export type Course = {
  serviceId: string;
  name: string;
  description: string | null;
  /** Null when the course is not sold as a month. */
  karnet: { lessons: number; pricePln: number } | null;
  enrollMode: "self" | "enquiry";
  words: EnrollWords;
  slots: CourseSlot[];
  /** Parked rather than removed — still on the studio's menu, not running. */
  suspended?: boolean;
};

const WEEKDAY = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const WEEKDAY_FULL = WEEKDAY;

/** Warsaw-safe enough for whole dates: no time component, so no DST to lose. */
function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}
function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}
function human(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12))
  );
}

function shortDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long" }).format(
    new Date(Date.UTC(y, m - 1, d, 12))
  );
}

/**
 * One course, the way the studio's own site lists it: the class, then the days
 * it runs on, and who comes on each.
 *
 * The schedule was built the other way round — a tile per weekly slot — which
 * turned three courses into eight tiles and hid the thing a parent is actually
 * choosing between.
 *
 * The days themselves are set where the course is defined, in Usługi. This is
 * the register: who is in, who is joining.
 */
export function CourseCard({ course, today }: { course: Course; today: string }) {
  const adminBase = useAdminBase();
  const [panel, setPanel] = useState<"none" | "enroll">("none");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  const weekdays = [...new Set(course.slots.filter((s) => s.active).map((s) => s.dayOfWeek))];
  const slotForDate = startDate
    ? course.slots.find((s) => s.active && s.dayOfWeek === weekdayOf(startDate))
    : null;

  // Eight weeks is as far ahead as a month's karnet can reach plus room to
  // start it later; beyond that the calendar is scrolling for its own sake.
  const days: { date: string; closed: boolean }[] = [];
  for (let i = 0; i < 56; i++) {
    const date = addDays(today, i);
    days.push({ date, closed: !weekdays.includes(weekdayOf(date)) });
  }

  const lessons = course.karnet?.lessons ?? 1;
  const plannedDates = startDate
    ? Array.from({ length: lessons }, (_, i) => addDays(startDate, i * 7))
    : [];

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-100">{course.name}</h2>
          {course.description && (
            <p className="mt-1 max-w-xl text-sm text-zinc-500">{course.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm text-zinc-300">
            {course.karnet
              ? `${course.karnet.pricePln} zł / miesiąc`
              : "cena do ustalenia"}
          </p>
          {course.suspended && (
            <p className="mt-0.5 text-[11px] text-zinc-500">tymczasowo odwołane</p>
          )}
        </div>
      </div>

      {/* The week, in one line per day it runs. */}
      <ul className="mt-4 space-y-1.5">
        {course.slots.map((s) => (
          <li
            key={s.id}
            className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border px-3 py-2 ${
              s.active
                ? "border-zinc-800/60 bg-zinc-900/40"
                : "border-zinc-800/40 bg-zinc-900/20 opacity-60"
            }`}
          >
            <span className="flex items-baseline gap-3">
              <span className="w-24 shrink-0 text-xs text-zinc-300">
                {WEEKDAY_FULL[s.dayOfWeek]}
              </span>
              <span className="font-mono text-xs text-zinc-200">
                {s.startTime}–{s.endTime}
              </span>
              {s.ageLabel && (
                <span className="text-[11px] text-zinc-500">{s.ageLabel}</span>
              )}
            </span>
            <span className="text-[11px] text-zinc-500">
              {s.active
                ? s.minParticipants && s.taken < s.minParticipants
                  ? `zapisanych ${s.taken} z ${s.minParticipants}`
                  : `zapisanych ${s.taken}`
                : "wyłączone z zapisów"}
            </span>
            {s.active && (
              <p className="w-full text-[11px] text-zinc-500">
                <span className="text-zinc-600">{shortDate(s.nextDate)}: </span>
                {s.names.length > 0 ? (
                  <span className="text-zinc-300">{s.names.join(", ")}</span>
                ) : (
                  "nikt jeszcze nie jest zapisany"
                )}
              </p>
            )}
          </li>
        ))}
        {course.slots.length === 0 && (
          <li className="text-sm text-zinc-600">
            {course.suspended
              ? "Bez dni — dodasz je pod „Edytuj zajęcia”, gdy zajęcia wrócą."
              : "Brak dni — dodaj dni i godziny pod „Edytuj zajęcia”."}
          </li>
        )}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {course.suspended ? (
          <span className="text-xs text-zinc-500">
            Zajęcia zawieszone — nie pokazują się rodzicom w zapisach.
          </span>
        ) : course.enrollMode === "enquiry" ? (
          <span className="text-xs text-zinc-500">
            Zapisy przez kontakt — warunki tych zajęć ustalane są indywidualnie.
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPanel(panel === "enroll" ? "none" : "enroll");
              setStartDate(null);
            }}
            disabled={course.slots.filter((s) => s.active).length === 0}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-40"
          >
            {course.words.action}
          </button>
        )}
        <Link
          href={`${adminBase}/uslugi/${course.serviceId}?z=1`}
          className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          Edytuj zajęcia
        </Link>
      </div>

      {panel === "enroll" && (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          {!startDate ? (
            <>
              <p className="text-sm text-zinc-300">Od kiedy zaczyna chodzić?</p>
              <p className="mt-1 mb-3 text-xs text-zinc-500">
                Podświetlone są dni, w które te zajęcia się odbywają:{" "}
                {weekdays.map((d) => WEEKDAY[d].toLowerCase()).join(", ")}.
              </p>
              <CalendarPicker
                days={days}
                selectedDate={undefined}
                today={today}
                markWeekdays={weekdays}
                onPick={(d) => setStartDate(d)}
                size="lg"
              />
            </>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-zinc-200">
                  Start: {human(startDate)}
                  {slotForDate && (
                    <span className="ml-2 font-mono text-xs text-zinc-500">
                      {slotForDate.startTime}–{slotForDate.endTime}
                    </span>
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
              {slotForDate ? (
                <GroupEnrollForm
                  key={`${slotForDate.id}-${startDate}-${round}`}
                  groupId={slotForDate.id}
                  startDate={startDate}
                  label={`${WEEKDAY[slotForDate.dayOfWeek]} ${slotForDate.startTime}–${slotForDate.endTime}`}
                  karnet={course.karnet}
                  dates={plannedDates.map(human)}
                  words={course.words}
                  onAgain={() => setRound((r) => r + 1)}
                  onClose={() => {
                    setPanel("none");
                    setStartDate(null);
                  }}
                />
              ) : (
                <p className="text-sm text-red-400">
                  W ten dzień te zajęcia się nie odbywają.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
