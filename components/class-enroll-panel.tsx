"use client";

import { useActionState, useState } from "react";
import { CalendarPicker } from "@/components/calendar-picker";

export type EnrollState = { status: "idle" | "error" | "ok"; message?: string };

export type EnrollDay = {
  /** The class_group this weekday belongs to. */
  groupId: string;
  dayOfWeek: number;
  /** "15:45–17:15" */
  time: string;
  taken: number;
  min: number | null;
  max: number | null;
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

const input =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-[var(--color-accent)]";

/**
 * Signing somebody up for a class: which day, from when, and who.
 *
 * One panel for both sides. The owner doing it by phone and the parent doing
 * it themselves are the same three decisions in the same order, and two
 * screens for one act drifted apart within a week of existing.
 *
 * The day tiles and the calendar are one control seen twice. Picking a tile
 * narrows the calendar to that weekday; picking a date in the calendar lights
 * its tile. Either way round, what is chosen is a day of the week and the
 * date the month starts on.
 */
export function ClassEnrollPanel({
  days,
  today,
  karnet,
  words,
  color,
  action,
  hidden,
  onClose,
  initialDate,
}: {
  days: EnrollDay[];
  today: string;
  /** Opens straight on this date — the schedule already knows which meeting. */
  initialDate?: string;
  /** Null when the class is not sold by the month. */
  karnet: { lessons: number; pricePln: number } | null;
  words: { enrollee: string; action: string };
  /** The class's own colour — see lib/class-colors.ts. */
  color: string;
  action: (prev: EnrollState, formData: FormData) => Promise<EnrollState>;
  /** Extra fields the server action needs, e.g. the tenant slug. */
  hidden?: Record<string, string>;
  /** Shown as a "close" button where the panel sits inside something else. */
  onClose?: () => void;
}) {
  const [pickedDay, setPickedDay] = useState<number | null>(
    initialDate ? weekdayOf(initialDate) : null
  );
  const [startDate, setStartDate] = useState<string | null>(initialDate ?? null);
  const [round, setRound] = useState(0);

  const weekdays = [...new Set(days.map((d) => d.dayOfWeek))];
  // Narrowed to the chosen weekday once there is one, so the calendar shows
  // the answer to the question just asked rather than all of them again.
  const live = pickedDay === null ? weekdays : [pickedDay];

  // Eight weeks: as far as a month reaches, plus room to start later.
  const calendar: { date: string; closed: boolean }[] = [];
  for (let i = 0; i < 56; i++) {
    const date = addDays(today, i);
    calendar.push({ date, closed: !live.includes(weekdayOf(date)) });
  }

  const slot = startDate
    ? days.find((d) => d.dayOfWeek === weekdayOf(startDate))
    : pickedDay !== null
      ? days.find((d) => d.dayOfWeek === pickedDay)
      : null;

  const lessons = karnet?.lessons ?? 1;
  const planned = startDate
    ? Array.from({ length: lessons }, (_, i) => addDays(startDate, i * 7))
    : [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-zinc-200">Który dzień?</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {days.map((d) => {
            const on = (startDate ? weekdayOf(startDate) : pickedDay) === d.dayOfWeek;
            const full = d.max != null && d.taken >= d.max;
            return (
              <li key={d.groupId}>
                <button
                  type="button"
                  disabled={full}
                  onClick={() => {
                    setPickedDay(d.dayOfWeek);
                    setStartDate(null);
                  }}
                  className="rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-40"
                  style={{
                    borderColor: on ? color : "#3f3f46",
                    backgroundColor: on
                      ? `color-mix(in srgb, ${color} 22%, transparent)`
                      : `color-mix(in srgb, ${color} 7%, transparent)`,
                  }}
                >
                  <span className="block text-xs text-zinc-200">{WEEKDAY[d.dayOfWeek]}</span>
                  <span className="block font-mono text-xs text-zinc-400">{d.time}</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">
                    {full
                      ? "brak miejsc"
                      : d.min != null && d.taken < d.min
                        ? `zbieramy grupę — ${d.taken} z ${d.min}`
                        : `zapisanych ${d.taken}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-200">
          {startDate ? "Pierwsze spotkanie" : "Od kiedy zaczynamy?"}
        </p>
        {startDate ? (
          <p className="mt-1 text-sm text-zinc-400">
            {human(startDate)}
            {slot && <span className="ml-2 font-mono text-xs text-zinc-500">{slot.time}</span>}
            <button
              type="button"
              onClick={() => {
                setStartDate(null);
                setPickedDay(null);
              }}
              className="ml-3 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
            >
              zmień
            </button>
          </p>
        ) : (
          <>
            <p className="mt-1 mb-3 text-sm text-zinc-500">
              {pickedDay === null
                ? "Podświetlone są dni, w które te zajęcia się odbywają."
                : `Podświetlone są ${WEEKDAY[pickedDay].toLowerCase()}i.`}
            </p>
            <CalendarPicker
              // Remounted when the chosen weekday changes, so the calendar
              // re-opens on the month holding the next one of those days
              // rather than staying on a month it has just emptied.
              key={live.join(",")}
              days={calendar}
              selectedDate={undefined}
              today={today}
              markColors={Object.fromEntries(live.map((d) => [d, [color]]))}
              onPick={(d) => {
                setStartDate(d);
                setPickedDay(weekdayOf(d));
              }}
              size="lg"
            />
          </>
        )}
      </div>

      {startDate && slot && (
        <EnrollFields
          key={`${slot.groupId}-${startDate}-${round}`}
          groupId={slot.groupId}
          startDate={startDate}
          dates={planned.map(human)}
          karnet={karnet}
          words={words}
          color={color}
          action={action}
          hidden={hidden}
          onAgain={() => setRound((r) => r + 1)}
          onClose={onClose}
        />
      )}
    </div>
  );
}

function EnrollFields({
  groupId,
  startDate,
  dates,
  karnet,
  words,
  color,
  action,
  hidden,
  onAgain,
  onClose,
}: {
  groupId: string;
  startDate: string;
  dates: string[];
  karnet: { lessons: number; pricePln: number } | null;
  words: { enrollee: string; action: string };
  color: string;
  action: (prev: EnrollState, formData: FormData) => Promise<EnrollState>;
  hidden?: Record<string, string>;
  onAgain: () => void;
  onClose?: () => void;
}) {
  // A single meeting was my invention, not theirs: nothing on the studio's
  // site offers a trial class, and a choice nobody asked for is one more
  // thing to explain. A class sold by the month is signed up for by the
  // month; one that is not is a single meeting because that is all it is.
  const mode: "karnet" | "probne" = karnet ? "karnet" : "probne";
  const [state, formAction, pending] = useActionState<EnrollState, FormData>(action, {
    status: "idle",
  });

  if (state.status === "ok") {
    return (
      <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <p className="text-sm text-emerald-400">{state.message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAgain}
            className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            {words.action}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Zamknij
            </button>
          )}
        </div>
      </div>
    );
  }

  const shown = mode === "karnet" ? dates : dates.slice(0, 1);

  return (
    <form action={formAction} className="space-y-4">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="mode" value={mode} />

      <div
        className="rounded-lg border px-4 py-3"
        style={{
          borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
        }}
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Zapis obejmuje
        </p>
        <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
          {shown.map((d, i) => (
            <li key={d} className="flex items-baseline gap-2 text-sm text-zinc-300">
              <span className="font-mono text-xs text-zinc-600">
                {i + 1}/{shown.length}
              </span>
              {d}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input name="childName" required maxLength={120} placeholder={`${words.enrollee} *`} className={input} />
        <input name="phone" type="tel" required maxLength={30} placeholder="Telefon *" className={input} />
        <input name="email" type="email" maxLength={160} placeholder="Email" className={input} />
        <input name="notes" maxLength={1000} placeholder="Uwagi" className={input} />
      </div>
      <p className="text-[11px] text-zinc-600">
        Jeśli ten numer jest już w bazie, zapis trafi do osoby o tym imieniu —
        rodzeństwo na jednym numerze zostaje osobno.
      </p>

      {state.status === "error" && state.message && (
        <p className="text-sm text-red-400">{state.message}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-accent-fg)] disabled:opacity-60"
        >
          {pending
            ? "Zapisuję…"
            : mode === "karnet" && karnet
              ? `Zapisz — ${karnet.pricePln} zł`
              : "Zapisz na jedno spotkanie"}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Anuluj
          </button>
        )}
      </div>
    </form>
  );
}
