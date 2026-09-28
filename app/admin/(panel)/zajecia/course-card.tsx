"use client";

import { useState } from "react";
import { GroupEnrollForm, type EnrollWords } from "./group-enroll-form";
import { SlotEditor, type SlotRow } from "./slot-editor";
import { CalendarPicker } from "@/components/calendar-picker";

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
const WEEKDAY_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

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

/**
 * One course, the way the studio's own site lists it: the class, then the days
 * it runs on.
 *
 * The schedule was built the other way round — a tile per weekly slot — which
 * turned three courses into eight tiles and hid the thing a parent is actually
 * choosing between.
 */
export function CourseCard({ course, today }: { course: Course; today: string }) {
  const [panel, setPanel] = useState<"none" | "enroll" | "slots">("none");
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
              ? `${course.karnet.pricePln} zł / ${course.karnet.lessons} spotkania`
              : "cena do ustalenia"}
          </p>
          {course.suspended && (
            <p className="mt-0.5 text-[11px] text-zinc-500">tymczasowo odwołane</p>
          )}
        </div>
      </div>

      {/* The week, in one line per day it runs. */}
      <ul className="mt-4 flex flex-wrap gap-2">
        {course.slots.map((s) => (
          <li
            key={s.id}
            className={`rounded-lg border px-3 py-2 ${
              s.active
                ? "border-zinc-800 bg-zinc-900/50"
                : "border-zinc-800/40 bg-zinc-900/20 opacity-60"
            }`}
          >
            <p className="font-mono text-xs text-zinc-300">
              {WEEKDAY_SHORT[s.dayOfWeek]} {s.startTime}–{s.endTime}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {s.active
                ? s.minParticipants && s.taken < s.minParticipants
                  ? `zapisanych ${s.taken} z ${s.minParticipants}`
                  : `zapisanych ${s.taken}`
                : "wyłączone z zapisów"}
            </p>
          </li>
        ))}
        {course.slots.length === 0 && (
          <li className="text-sm text-zinc-600">
            {course.suspended
              ? "Bez terminów — dodaj je, gdy zajęcia wrócą."
              : "Brak terminów — dodaj je poniżej."}
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
            Zapisy przez kontakt — ten kurs ustala warunki indywidualnie.
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
        <button
          type="button"
          onClick={() => setPanel(panel === "slots" ? "none" : "slots")}
          className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          Terminy {panel === "slots" ? "▴" : "▾"}
        </button>
      </div>

      {panel === "slots" && (
        <SlotEditor serviceId={course.serviceId} slots={course.slots} />
      )}

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
