"use client";

import { useState } from "react";
import Link from "next/link";
import { sectionHeading } from "@/components/ui/surface";
import { CalendarPicker } from "@/components/calendar-picker";
import { GroupEnrollForm, type EnrollWords } from "../../zajecia/group-enroll-form";
import { WEEKDAY_NAMES, WEEKDAY_SHORT, WEEK_ORDER } from "@/lib/class-groups";
import { meetingsLabel } from "@/lib/service-label";
import { tint } from "@/lib/class-colors";
import { useAdminBase } from "@/lib/use-admin-base";

export type EntrySlot = {
  groupId: string;
  dayOfWeek: number;
  /** "15:45" */
  startTime: string;
  endTime: string;
  ageLabel: string | null;
};

export type EntryClass = {
  serviceId: string;
  name: string;
  description: string | null;
  color: string;
  pricePln: number;
  /** Null when the class is not sold as several meetings for one price. */
  karnet: { lessons: number; pricePln: number } | null;
  /** Signed up for by conversation, not here — see services.enroll_mode. */
  enquiry: boolean;
  words: EnrollWords;
  slots: EntrySlot[];
};

/** Warsaw-safe enough for whole dates: no time component, so no DST to lose. */
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
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12))
  );
}

/**
 * "Nowy zapis" for a studio: which class, from which day, and who.
 *
 * The salon's form asks for a service, a day and a free hour. None of that
 * fits a class — its hours are fixed and a sign-up takes a month of them — so
 * the old form offered a calendar of opening hours and then "Brak wolnych
 * terminów" for a Monday the class plainly runs on. Here the calendar lights
 * the class's own days in its own colour, and picking one leads straight to
 * the child's details, through the same form the classes page and the
 * schedule use.
 *
 * The day can come first too. Before a class is chosen every class's days are
 * lit, a day with two of them split between both colours, and picking such a
 * day asks which one.
 */
export function ClassEntry({
  classes,
  today,
  bookingHref,
}: {
  classes: EntryClass[];
  today: string;
  /** Where the appointment form is, when the tenant also sells those. */
  bookingHref: string | null;
}) {
  const adminBase = useAdminBase();
  const open = classes.filter((c) => !c.enquiry && c.slots.length > 0);
  const [serviceId, setServiceId] = useState<string | null>(
    open.length === 1 ? open[0].serviceId : null
  );
  const [date, setDate] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  const chosen = open.find((c) => c.serviceId === serviceId) ?? null;
  const pool = chosen ? [chosen] : open;

  // Each weekday's colours in the order the classes meet, so a split day
  // reads left to right the way the afternoon goes.
  const markColors: Record<number, string[]> = {};
  const byTime = pool
    .flatMap((c) => c.slots.map((s) => ({ c, s })))
    .sort((a, b) => a.s.startTime.localeCompare(b.s.startTime));
  for (const { c, s } of byTime) {
    const list = (markColors[s.dayOfWeek] ??= []);
    if (!list.includes(c.color)) list.push(c.color);
  }

  // Eight weeks: as far as a month of meetings reaches plus room to start it
  // later; beyond that the calendar is scrolling for its own sake.
  const days = Array.from({ length: 56 }, (_, i) => {
    const d = addDays(today, i);
    return { date: d, closed: !markColors[weekdayOf(d)] };
  });

  // What meets on the picked day, among the classes in play.
  const options = date
    ? pool.flatMap((c) =>
        c.slots.filter((s) => s.dayOfWeek === weekdayOf(date)).map((s) => ({ c, s }))
      )
    : [];
  const picked = options.find((o) => o.s.groupId === groupId) ?? null;

  function pickClass(id: string) {
    setServiceId(id === serviceId ? null : id);
    setDate(null);
    setGroupId(null);
  }

  function pickDate(d: string) {
    setDate(d);
    const here = pool.flatMap((c) =>
      c.slots.filter((s) => s.dayOfWeek === weekdayOf(d)).map((s) => ({ c, s }))
    );
    if (here.length === 1) {
      setServiceId(here[0].c.serviceId);
      setGroupId(here[0].s.groupId);
    } else {
      setGroupId(null);
    }
  }

  function reset() {
    setDate(null);
    setGroupId(null);
  }

  const lessons = picked?.c.karnet?.lessons ?? 1;
  const planned =
    date && picked ? Array.from({ length: lessons }, (_, i) => addDays(date, i * 7)) : [];
  const weekdaysOfChosen = chosen
    ? WEEK_ORDER.filter((d) => chosen.slots.some((s) => s.dayOfWeek === d))
    : [];

  return (
    <div className="space-y-8">
      {/* STEP 1 — WHICH CLASS */}
      <section>
        <p className={`mb-3 ${sectionHeading}`}>1 · Zajęcia</p>
        {classes.length === 0 && (
          <p className="text-sm text-zinc-500">
            Nie ma jeszcze żadnych zajęć. Utwórz je w{" "}
            <Link href={`${adminBase}/uslugi`} className="text-zinc-300 underline underline-offset-2">
              Usługach
            </Link>
            .
          </p>
        )}
        {/* One column: each row carries its days, and side by side those
            lines wrapped into something nobody could scan. */}
        <div className="space-y-2">
          {classes.map((c) => {
            const on = c.serviceId === serviceId;
            const disabled = c.enquiry || c.slots.length === 0;
            const week = WEEK_ORDER.flatMap((d) =>
              c.slots
                .filter((s) => s.dayOfWeek === d)
                .map((s) => `${WEEKDAY_SHORT[d].toLowerCase()} ${s.startTime}–${s.endTime}`)
            );
            return (
              <button
                key={c.serviceId}
                type="button"
                onClick={() => !disabled && pickClass(c.serviceId)}
                disabled={disabled}
                aria-pressed={on}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                  on ? "" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                } disabled:cursor-not-allowed disabled:opacity-50`}
                style={on ? { borderColor: c.color, backgroundColor: tint(c.color, 12) } : undefined}
              >
                <span
                  aria-hidden
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-tight text-zinc-100">{c.name}</span>
                  <span className="mt-1 block font-mono text-xs text-zinc-500">
                    {week.length > 0 ? week.join(" · ") : "bez dni w grafiku"}
                  </span>
                  {c.enquiry && (
                    <span className="mt-1 block text-xs text-zinc-500">
                      Zapisy przez kontakt — warunki tych zajęć ustalane są indywidualnie.
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-sm font-semibold text-zinc-200">
                    {c.karnet ? `${c.karnet.pricePln} zł` : c.pricePln > 0 ? `${c.pricePln} zł` : "—"}
                  </span>
                  {c.karnet && (
                    <span className="block text-[11px] text-zinc-500">
                      {meetingsLabel(c.karnet.lessons)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* STEP 2 — FROM WHEN */}
      {open.length > 0 && (
        <section>
          <p className={`mb-1 ${sectionHeading}`}>2 · Od kiedy</p>
          <p className="mb-3 text-xs text-zinc-500">
            {chosen
              ? `Świecą dni tych zajęć: ${weekdaysOfChosen
                  .map((d) => WEEKDAY_NAMES[d].toLowerCase())
                  .join(", ")}. Zapis zajmie kolejne tygodnie od wybranego dnia.`
              : "Kolor dnia to zajęcia, które się w nim odbywają. Wybierz zajęcia wyżej albo od razu dzień."}
          </p>
          <div className="max-w-[26rem]">
            <CalendarPicker
              days={days}
              selectedDate={date ?? undefined}
              today={today}
              markColors={markColors}
              onPick={pickDate}
            />
          </div>

          {/* A day two classes share: ask rather than guess. */}
          {date && !picked && options.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-zinc-300">
                {human(date)} odbywa się więcej niż jedne zajęcia — na które zapisujemy?
              </p>
              <div className="flex flex-wrap gap-2">
                {options.map(({ c, s }) => (
                  <button
                    key={s.groupId}
                    type="button"
                    onClick={() => {
                      setServiceId(c.serviceId);
                      setGroupId(s.groupId);
                    }}
                    className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-zinc-200"
                    style={{ borderColor: c.color, backgroundColor: tint(c.color, 12) }}
                  >
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {s.ageLabel ?? c.name}
                    <span className="font-mono text-zinc-400">
                      {s.startTime}–{s.endTime}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* STEP 3 — WHO */}
      {date && picked && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className={sectionHeading}>3 · Dane</p>
            <button type="button" onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300">
              Zmień dzień
            </button>
          </div>
          <div
            className="rounded-xl border p-5"
            style={{ borderColor: picked.c.color, backgroundColor: tint(picked.c.color, 6) }}
          >
            <p className="mb-3 text-sm text-zinc-200">
              <span className="font-medium">{picked.c.name}</span>
              <span className="ml-2 text-zinc-400">
                od {human(date)} · {WEEKDAY_NAMES[picked.s.dayOfWeek].toLowerCase()}{" "}
                <span className="font-mono">
                  {picked.s.startTime}–{picked.s.endTime}
                </span>
              </span>
            </p>
            <GroupEnrollForm
              key={`${picked.s.groupId}-${date}-${round}`}
              groupId={picked.s.groupId}
              startDate={date}
              label={picked.s.ageLabel ?? picked.c.name}
              karnet={picked.c.karnet}
              dates={planned.map(human)}
              words={picked.c.words}
              onAgain={() => setRound((r) => r + 1)}
              onClose={reset}
            />
          </div>
        </section>
      )}

      {bookingHref && (
        <p className="text-sm text-zinc-500">
          Termin na inną usługę, np. warsztat?{" "}
          <Link href={bookingHref} className="text-zinc-300 underline underline-offset-2">
            Nowa rezerwacja
          </Link>
        </p>
      )}
    </div>
  );
}
