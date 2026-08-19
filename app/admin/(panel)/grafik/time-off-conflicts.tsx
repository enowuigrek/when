"use client";

import { useState } from "react";
import {
  BookingManagementButton,
  type BookingForModal,
  type BookingOutcome,
} from "@/components/booking-management-modal";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

/** "21 sie" from a YYYY-MM-DD. */
function shortDate(day: string) {
  return new Date(day + "T12:00:00Z").toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

/**
 * What was done, in the fewest words that still say it.
 *
 * Written as "label: value" rather than as a verb phrase: Polish would decline
 * the name after "przepisana do…", and a staff list holds names this code
 * cannot inflect safely. The colon sidesteps the grammar and stays readable.
 */
function outcomeLabel(o: BookingOutcome): string {
  switch (o.kind) {
    case "reschedule":
      return `Przełożona: ${shortDate(o.date)}, ${o.time}`;
    case "reassign":
      return `Nowy pracownik: ${o.staffName}`;
    case "cancel":
      return "Anulowana";
    case "no_show":
      return "Nie przyszedł";
  }
}

/**
 * What is still booked over a freshly entered absence.
 *
 * The absence is saved either way — refusing it would leave someone unable to
 * record that a person is off sick. So this reports rather than blocks, and
 * every row opens the booking's own window so it can be moved or reassigned
 * without leaving the list.
 *
 * Rows keep a note of what you did to them. The list is client state, built
 * from the conflicts the server found at the moment the absence was saved, so
 * nothing about it changes when a booking underneath does — without this you
 * would come back from the third booking unable to tell which of the first two
 * you had already handled.
 *
 * Shared by both ways in: clicking a day in the roster, and the add form in
 * the panel beside it.
 */
export function TimeOffConflicts({
  conflicts,
  allStaff,
  onClose,
}: {
  conflicts: BookingForModal[];
  allStaff: { id: string; name: string; color: string }[];
  onClose: () => void;
}) {
  const [done, setDone] = useState<Record<string, BookingOutcome>>({});
  const left = conflicts.length - Object.keys(done).length;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-400">Konflikt z rezerwacjami</p>
              <h2 className="mt-0.5 text-lg font-semibold text-zinc-100">
                {left === 0
                  ? "Wszystko obsłużone"
                  : `${left} ${left === 1 ? "rezerwacja wymaga" : "rezerwacje wymagają"} przełożenia`}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Nieobecność została dodana. Te rezerwacje wciąż istnieją — kliknij każdą, aby przełożyć
                lub zmienić pracownika.
              </p>
            </div>
            <button onClick={onClose} className="shrink-0 text-2xl leading-none text-zinc-600 hover:text-zinc-300">×</button>
          </div>
        </div>

        {/* Dashed, like the rows in the schedule: a divider between items of one
            list, not a boundary between sections of the dialog. */}
        <ul className="max-h-[60vh] divide-y divide-dashed divide-zinc-800 overflow-y-auto">
          {conflicts.map((b) => {
            const outcome = done[b.id];
            return (
              <li key={b.id}>
                <BookingManagementButton
                  booking={b}
                  allStaff={allStaff}
                  onResolved={(o) => setDone((prev) => ({ ...prev, [b.id]: o }))}
                  className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-zinc-900/60"
                >
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm text-zinc-300">{formatWarsawTime(b.startsAt)}</p>
                    <p className="font-mono text-xs text-zinc-600">{formatWarsawDate(b.startsAt)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200">{b.customerName}</p>
                    <p className="font-mono text-xs text-zinc-500">{b.customerPhone}</p>
                    {b.serviceName && <p className="text-xs text-zinc-500">{b.serviceName}</p>}
                  </div>
                  {outcome && (
                    <span className="shrink-0 self-center rounded-full border border-emerald-700/50 px-2.5 py-1 text-xs text-emerald-400">
                      {outcomeLabel(outcome)}
                    </span>
                  )}
                </BookingManagementButton>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end border-t border-zinc-800 px-5 py-3">
          <button onClick={onClose} className="rounded-full border border-zinc-700 px-4 py-1 text-xs text-zinc-300 hover:border-zinc-500">
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
