"use client";

import { useActionState } from "react";
import type { StaffTimeOff } from "@/lib/db/staff-schedule";
import { addTimeOffAction, deleteTimeOffAction, type TimeOffState } from "./schedule-actions";

const TYPE_LABELS: Record<StaffTimeOff["type"], string> = {
  sick: "L4",
  vacation: "Urlop",
  personal: "Wyjście prywatne",
  other: "Inne",
};

const TYPE_COLORS: Record<StaffTimeOff["type"], string> = {
  sick: "text-red-400 border-red-900/50",
  vacation: "text-emerald-400 border-emerald-900/50",
  personal: "text-blue-400 border-blue-900/50",
  other: "text-zinc-400 border-zinc-700",
};

const input =
  "rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";

export function TimeOffSection({
  staffId,
  timeOff,
}: {
  staffId: string;
  timeOff: StaffTimeOff[];
}) {
  const [state, action, pending] = useActionState<TimeOffState, FormData>(
    addTimeOffAction,
    { status: "idle" }
  );

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form action={action} className="space-y-3">
        <input type="hidden" name="staffId" value={staffId} />

        {state.status === "ok" && (
          <p className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-4 py-2 text-sm text-emerald-300">
            Nieobecność dodana.
          </p>
        )}
        {state.status === "error" && (
          <p className="rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-2 text-sm text-red-300">
            {state.message}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs text-zinc-500">Od</label>
            <input type="date" name="start_date" required className={`${input} w-full`} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-zinc-500">Do (włącznie)</label>
            <input type="date" name="end_date" required className={`${input} w-full`} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs text-zinc-500">Typ</label>
            <select name="type" className={`${input} w-full`}>
              <option value="sick">L4 — zwolnienie lekarskie</option>
              <option value="vacation">Urlop wypoczynkowy</option>
              <option value="personal">Wyjście prywatne / elastyczne</option>
              <option value="other">Inne</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-zinc-500">Notatka (opcjonalnie)</label>
            <input type="text" name="note" placeholder="np. urlop w górach" className={`${input} w-full`} />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50"
          >
            {pending ? "Dodaję…" : "+ Dodaj nieobecność"}
          </button>
        </div>
      </form>

      {/* List */}
      {timeOff.length > 0 ? (
        <ul className="space-y-2">
          {timeOff.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
            >
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[t.type]}`}
              >
                {TYPE_LABELS[t.type]}
              </span>
              <span className="flex-1 font-mono text-sm text-zinc-300">
                {t.start_date === t.end_date ? t.start_date : `${t.start_date} — ${t.end_date}`}
              </span>
              {t.note && <span className="text-xs text-zinc-500">{t.note}</span>}
              <form action={deleteTimeOffAction}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="staffId" value={staffId} />
                <button
                  type="submit"
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                  aria-label="Usuń"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600">Brak zarejestrowanych nieobecności.</p>
      )}
    </div>
  );
}
