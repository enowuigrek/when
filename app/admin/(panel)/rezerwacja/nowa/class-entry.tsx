"use client";

import { useState } from "react";
import Link from "next/link";
import { sectionHeading } from "@/components/ui/surface";
import type { EnrollWords } from "@/lib/vocabulary";
import { ClassEnrollPanel } from "@/components/class-enroll-panel";
import { addToGroupAction } from "../../zajecia/actions";
import { WEEKDAY_SHORT, WEEK_ORDER } from "@/lib/class-groups";
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



  function pickClass(id: string) {
    setServiceId(id === serviceId ? null : id);
  }




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

      {/* STEP 2 — WHO. The panel asks the day and the first meeting itself,
          so the screen no longer carries a second calendar that could
          disagree with it. */}
      {chosen && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className={sectionHeading}>2 · Zapis</p>
            {open.length > 1 && (
              <button
                type="button"
                onClick={() => setServiceId(null)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Zmień zajęcia
              </button>
            )}
          </div>
          <div
            className="rounded-xl border p-5"
            style={{ borderColor: chosen.color, backgroundColor: tint(chosen.color, 6) }}
          >
            <p className="mb-4 text-sm font-medium text-zinc-200">{chosen.name}</p>
            <ClassEnrollPanel
              days={chosen.slots.map((s) => ({
                groupId: s.groupId,
                dayOfWeek: s.dayOfWeek,
                time: `${s.startTime}–${s.endTime}`,
                taken: 0,
                min: null,
                max: null,
              }))}
              today={today}
              karnet={chosen.karnet}
              words={chosen.words}
              color={chosen.color}
              action={addToGroupAction}
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
