"use client";

import { useState, useTransition } from "react";
import type { Slot } from "@/lib/slots";
import type { TimeFilter } from "@/lib/db/settings";
import { CalendarPicker } from "@/components/calendar-picker";
import { getSlotsForReschedule, rescheduleBookingAction } from "./actions";

type Day = { date: string; closed: boolean };

export function RescheduleFlow({
  token,
  serviceSlug,
  days,
  initialDate,
  initialSlots,
  timeFilters,
  today,
}: {
  token: string;
  serviceSlug: string;
  days: Day[];
  initialDate: string;
  initialSlots: Slot[];
  timeFilters: TimeFilter[];
  today: string;
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loadingSlots, startSlotLoad] = useTransition();
  const [submitting, startSubmit] = useTransition();

  function pickDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setActiveFilter(null);
    startSlotLoad(async () => {
      const res = await getSlotsForReschedule(serviceSlug, date);
      setSlots(res.ok ? res.slots : []);
    });
  }

  const visibleSlots = activeFilter
    ? slots.filter((s) => {
        const f = timeFilters.find((f) => f.id === activeFilter);
        if (!f) return true;
        const h = Number(s.label.split(":")[0]);
        return h >= f.from_hour && h < f.to_hour;
      })
    : slots;

  return (
    <div className="mt-8 space-y-10">
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
          Wybierz nowy dzień
        </h2>
        <CalendarPicker days={days} selectedDate={selectedDate} onPick={pickDate} today={today} />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
            Wolne godziny
          </h2>
          {timeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {timeFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === f.id ? null : f.id)}
                  className={`rounded-full border px-3 py-0.5 text-xs transition-colors ${
                    activeFilter === f.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loadingSlots ? (
          <p className="text-sm text-zinc-500">Ładowanie…</p>
        ) : visibleSlots.length === 0 ? (
          <p className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 text-sm text-zinc-400">
            {slots.length === 0
              ? "Brak terminów tego dnia. Wybierz inny."
              : "Brak terminów w tym przedziale — spróbuj inny filtr."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {visibleSlots.map((s) => {
              const isSelected = s.startsAtIso === selectedSlot?.startsAtIso;
              const isTaken = s.available === false;
              return (
                <button
                  key={s.startsAtIso}
                  type="button"
                  disabled={isTaken}
                  onClick={() => !isTaken && setSelectedSlot(s)}
                  title={isTaken ? "Termin zajęty" : undefined}
                  className={`rounded-md border py-2 font-mono text-sm transition-colors ${
                    isTaken
                      ? "cursor-not-allowed border-zinc-800/40 bg-zinc-900/20 text-zinc-600 line-through"
                      : isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-zinc-950"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedSlot && (
        <form
          action={rescheduleBookingAction}
          onSubmit={(e) => {
            e.preventDefault();
            startSubmit(() =>
              rescheduleBookingAction(new FormData(e.currentTarget))
            );
          }}
          className="space-y-4"
        >
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="startsAtIso" value={selectedSlot.startsAtIso} />
          <p className="text-sm text-zinc-400">
            Nowy termin:{" "}
            <span className="text-zinc-200">
              {selectedDate} o godz. {selectedSlot.label}
            </span>
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {submitting ? "Zmieniam termin…" : "Potwierdź nowy termin"}
          </button>
        </form>
      )}
    </div>
  );
}
