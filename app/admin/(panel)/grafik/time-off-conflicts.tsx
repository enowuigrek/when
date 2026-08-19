"use client";

import { BookingManagementButton, type BookingForModal } from "@/components/booking-management-modal";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

/**
 * What is still booked over a freshly entered absence.
 *
 * The absence is saved either way — refusing it would leave someone unable to
 * record that a person is off sick. So this reports rather than blocks, and
 * every row opens the booking's own window so it can be moved or reassigned
 * from here.
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
                {conflicts.length} {conflicts.length === 1 ? "rezerwacja wymaga" : "rezerwacje wymagają"} przełożenia
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Nieobecność została dodana. Te rezerwacje wciąż istnieją — kliknij każdą, aby przełożyć lub przepisać na innego pracownika.
              </p>
            </div>
            <button onClick={onClose} className="shrink-0 text-2xl leading-none text-zinc-600 hover:text-zinc-300">×</button>
          </div>
        </div>
        <ul className="max-h-[60vh] divide-y divide-zinc-800 overflow-y-auto">
          {conflicts.map((b) => (
            <li key={b.id}>
              <BookingManagementButton
                booking={b}
                allStaff={allStaff}
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
              </BookingManagementButton>
            </li>
          ))}
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
