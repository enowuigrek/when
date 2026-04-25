"use client";

import { useState, useTransition } from "react";
import { formatWarsawTime } from "@/lib/slots";
import type { BookingWithService } from "@/lib/db/bookings";
import { cancelBookingAction } from "./actions";

const CANCEL_REASONS = [
  "Choroba fryzjera",
  "Nagła nieobecność",
  "Awaria sprzętu",
  "Zmiana grafiku",
  "Prośba klienta",
  "Inne",
];

export function BookingRow({ b }: { b: BookingWithService }) {
  const [showCancel, setShowCancel] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [pending, startTransition] = useTransition();
  const isOther = selectedReason === "Inne";
  const cancelled = b.status === "cancelled";

  function handleCancel(formData: FormData) {
    startTransition(async () => {
      await cancelBookingAction(formData);
      setShowCancel(false);
    });
  }

  return (
    <li className={`rounded-lg border border-zinc-800/60 bg-zinc-900/40 ${cancelled ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-4 p-4">
        {/* Time */}
        <div className="w-20 shrink-0 font-mono text-lg text-[var(--color-accent)]">
          {formatWarsawTime(b.starts_at)}
          <div className="font-mono text-xs text-zinc-500">
            {formatWarsawTime(b.ends_at)}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-medium text-zinc-100">{b.customer_name}</span>
            <a
              href={`tel:${b.customer_phone}`}
              className="font-mono text-sm text-zinc-400 hover:text-[var(--color-accent)]"
            >
              {b.customer_phone}
            </a>
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            {b.service?.name ?? "—"}
            {b.service && (
              <span className="ml-2 text-zinc-600">
                · {b.service.duration_min} min · {b.service.price_pln} zł
              </span>
            )}
          </div>
          {b.notes && (
            <p className="mt-2 rounded border-l-2 border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-300">
              {b.notes}
            </p>
          )}
          {cancelled && (
            <p className="mt-1 text-xs uppercase tracking-wider text-red-400">Anulowana</p>
          )}
        </div>

        {/* Actions */}
        {!cancelled && (
          <button
            type="button"
            onClick={() => setShowCancel((v) => !v)}
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-red-900 hover:bg-red-950/20 hover:text-red-400"
          >
            {showCancel ? "Zamknij" : "Anuluj"}
          </button>
        )}
      </div>

      {/* Inline cancel form */}
      {showCancel && !cancelled && (
        <form
          action={handleCancel}
          className="border-t border-zinc-800/60 px-4 pb-4 pt-3"
        >
          <input type="hidden" name="id" value={b.id} />
          <div className="space-y-2">
            <span className="block text-xs text-zinc-400">
              Powód <span className="text-zinc-600">(trafi do maila klienta)</span>
            </span>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none"
            >
              <option value="">— bez powodu —</option>
              {CANCEL_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {isOther && (
              <textarea
                name="reason"
                rows={2}
                placeholder="Opisz powód…"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
              />
            )}
            {!isOther && (
              <input type="hidden" name="reason" value={selectedReason} />
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-red-900/80 px-4 py-1.5 text-xs font-medium text-red-100 transition-colors hover:bg-red-800 disabled:opacity-60"
            >
              {pending ? "Anuluję…" : "Potwierdź anulowanie"}
            </button>
            <button
              type="button"
              onClick={() => setShowCancel(false)}
              className="rounded-full border border-zinc-800 px-4 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Wróć
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
