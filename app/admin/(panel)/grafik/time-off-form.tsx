"use client";

import type { ReactNode } from "react";

const input =
  "w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";

/**
 * The one form for entering an absence.
 *
 * It is reached two ways — from a day in the roster and from the panel beside
 * it — which had drifted into two forms: one showed "Od" as a read-only field
 * with no date picker beside an editable "Do (opcj.)", so two controls of the
 * same kind looked like different things on one row.
 *
 * Both dates are editable here and both default to the day you came from.
 * Clicking a cell still fills them in for you; it just no longer locks them,
 * which is what you want the moment the absence turns out to run two days.
 */
export function TimeOffForm({
  staffId,
  defaultDate,
  header,
  action,
  pending,
  onCancel,
}: {
  staffId: string;
  defaultDate: string;
  /** Who this is for, when the surrounding context has not already said. */
  header?: ReactNode;
  action: (formData: FormData) => void;
  pending: boolean;
  onCancel: () => void;
}) {
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="staffId" value={staffId} />

      {header}

      <label className="block">
        <span className="mb-1 block text-xs text-zinc-500">Typ</span>
        <select name="type" defaultValue="vacation" className={input}>
          <option value="vacation">Urlop</option>
          <option value="sick">L4 (chorobowe)</option>
          <option value="personal">Sprawy prywatne</option>
          <option value="other">Inne</option>
        </select>
      </label>

      <div className="flex items-start gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs text-zinc-500">Od</span>
          <input
            type="date"
            name="start_date"
            defaultValue={defaultDate}
            required
            className={`${input} font-mono`}
          />
        </label>
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs text-zinc-500">Do</span>
          <input
            type="date"
            name="end_date"
            defaultValue={defaultDate}
            required
            className={`${input} font-mono`}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-zinc-500">Notatka (opcj.)</span>
        <input type="text" name="note" placeholder="np. wyjazd" className={input} />
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="text-xs text-zinc-600 hover:text-zinc-400">
          Anuluj
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-950 disabled:opacity-50"
        >
          {pending ? "…" : "Dodaj"}
        </button>
      </div>
    </form>
  );
}
