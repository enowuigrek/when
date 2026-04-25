"use client";

import { useActionState, useState } from "react";
import type { BusinessHours } from "@/lib/types";
import { updateBusinessHoursAction, type HoursFormState } from "./actions";
import { dayLabels } from "@/lib/business";

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0] as const; // Mon → Sun

function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5); // "10:00:00" → "10:00"
}

export function HoursSection({ hours }: { hours: BusinessHours[] }) {
  const [state, action, pending] = useActionState<HoursFormState, FormData>(
    updateBusinessHoursAction,
    { status: "idle" }
  );

  const getRow = (dow: number) => hours.find((h) => h.day_of_week === dow);

  const [closedDays, setClosedDays] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const dow of ORDERED_DAYS) {
      init[dow] = getRow(dow)?.closed ?? false;
    }
    return init;
  });

  const toggleClosed = (dow: number) =>
    setClosedDays((prev) => ({ ...prev, [dow]: !prev[dow] }));

  const inputCls =
    "rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-30 disabled:cursor-not-allowed w-24";

  return (
    <form action={action} className="space-y-4">
      {state.status === "ok" && (
        <p className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">
          Godziny zapisane.
        </p>
      )}
      {state.status === "error" && (
        <p className="rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40">
        {ORDERED_DAYS.map((dow) => {
          const row = getRow(dow);
          const isClosed = closedDays[dow];
          return (
            <div key={dow} className="flex flex-wrap items-center gap-3 px-5 py-3">
              {/* Hidden field for closed state */}
              <input type="hidden" name={`closed_${dow}`} value={isClosed ? "1" : "0"} />

              <span className="w-32 text-sm font-medium text-zinc-200">
                {dayLabels[dow]}
              </span>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={isClosed}
                  onChange={() => toggleClosed(dow)}
                  className="accent-[var(--color-accent)]"
                />
                Zamknięte
              </label>

              <div className={`flex items-center gap-2 ${isClosed ? "opacity-30 pointer-events-none" : ""}`}>
                <input
                  type="time"
                  name={`open_${dow}`}
                  defaultValue={formatTime(row?.open_time)}
                  disabled={isClosed}
                  className={inputCls}
                />
                <span className="text-zinc-600">—</span>
                <input
                  type="time"
                  name={`close_${dow}`}
                  defaultValue={formatTime(row?.close_time)}
                  disabled={isClosed}
                  className={inputCls}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {pending ? "Zapisuję…" : "Zapisz godziny"}
        </button>
      </div>
    </form>
  );
}
