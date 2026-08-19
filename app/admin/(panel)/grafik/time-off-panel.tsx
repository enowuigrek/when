"use client";

import { useState, useEffect, useActionState, useTransition } from "react";
import {
  addTimeOffFromGrafikAction,
  deleteTimeOffFromGrafikAction,
  type AddTimeOffState,
} from "./grafik-actions";
import { TimeOffConflicts } from "./time-off-conflicts";

type Staff = { id: string; name: string; color: string };

export type TimeOffEntry = {
  id: string;
  staffId: string;
  staffName: string;
  staffColor: string;
  type: "sick" | "vacation" | "personal" | "other";
  startDate: string;
  endDate: string;
  note: string | null;
};

const TYPE_LABELS: Record<TimeOffEntry["type"], string> = {
  sick: "L4",
  vacation: "Urlop",
  personal: "Prywatne",
  other: "Inne",
};

const TYPE_COLORS: Record<TimeOffEntry["type"], string> = {
  sick: "text-red-400 border-red-900/50",
  vacation: "text-emerald-400 border-emerald-900/50",
  personal: "text-blue-400 border-blue-900/50",
  other: "text-zinc-400 border-zinc-700",
};

const input =
  "w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";

/** "12 sie" — the year is noise for absences a few weeks out. */
function shortDate(day: string) {
  return new Date(day + "T12:00:00Z").toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

function range(start: string, end: string) {
  return start === end ? shortDate(start) : `${shortDate(start)} – ${shortDate(end)}`;
}

/**
 * Absences for whoever is currently filtered in above the roster.
 *
 * The panel used to carry its own row of staff buttons, which meant two
 * different answers on screen to "who am I looking at" — the person picked
 * here, and the columns picked above. The chips over the roster now decide
 * both, so the two always agree.
 *
 * That leaves the question of who an absence is *for*. With one person filtered
 * in it is unambiguous, and the form below says their name. With several, the
 * form would need its own picker — the thing just removed — so instead the way
 * in is to click the day in the grid: the cell already knows the person and the
 * date, the same way an empty slot in the schedule already knows them.
 */
export function TimeOffPanel({
  entries,
  soleStaff,
  visibleCount,
  allStaff,
  today,
}: {
  entries: TimeOffEntry[];
  /** The only person on screen, when exactly one is filtered in. */
  soleStaff: Staff | null;
  visibleCount: number;
  allStaff: Staff[];
  today: string;
}) {
  const [adding, setAdding] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [state, action, pending] = useActionState<AddTimeOffState, FormData>(
    addTimeOffFromGrafikAction,
    { status: "idle" }
  );
  const [showConflicts, setShowConflicts] = useState(false);

  useEffect(() => {
    if (state.status === "ok") {
      setAdding(false);
      if (state.conflicts.length > 0) setShowConflicts(true);
    }
  }, [state]);

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-200">Nieobecności</h2>
        {soleStaff && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            + Dodaj
          </button>
        )}
      </div>

      <p className="mt-1 text-xs text-zinc-600">
        {soleStaff
          ? `Nadchodzące — ${soleStaff.name}.`
          : visibleCount > 1
          ? "Nadchodzące. Żeby dodać, kliknij dzień w grafiku — komórka zna już osobę i datę."
          : "Nadchodzące."}
      </p>

      {state.status === "error" && (
        <p className="mt-3 rounded-lg border border-red-700/50 bg-red-900/30 px-3 py-2 text-xs text-red-300">
          {state.message}
        </p>
      )}

      {soleStaff && adding && (
        <form action={action} className="mt-3 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <input type="hidden" name="staffId" value={soleStaff.id} />

          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: soleStaff.color }} />
            {soleStaff.name}
          </div>

          <select name="type" defaultValue="vacation" className={input}>
            <option value="vacation">Urlop</option>
            <option value="sick">L4 (chorobowe)</option>
            <option value="personal">Sprawy prywatne</option>
            <option value="other">Inne</option>
          </select>

          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-xs text-zinc-500">Od</span>
              <input type="date" name="start_date" defaultValue={today} required className={`${input} font-mono`} />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-xs text-zinc-500">Do</span>
              <input type="date" name="end_date" defaultValue={today} required className={`${input} font-mono`} />
            </label>
          </div>

          <input type="text" name="note" placeholder="Notatka (opcj.)" className={input} />

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-xs text-zinc-600 hover:text-zinc-400"
            >
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
      )}

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">Nikogo nie brakuje.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {entries.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-2.5 py-2"
            >
              <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[t.type]}`}>
                {TYPE_LABELS[t.type]}
              </span>
              <span className="min-w-0 flex-1">
                {/* The name only earns its line when more than one person is on
                    screen — with one filtered in the heading already said it. */}
                {visibleCount > 1 && (
                  <span className="flex items-center gap-1.5 truncate text-xs text-zinc-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.staffColor }} />
                    {t.staffName}
                  </span>
                )}
                <span className="block truncate font-mono text-xs text-zinc-500">{range(t.startDate, t.endDate)}</span>
                {t.note && <span className="block truncate text-xs text-zinc-600">{t.note}</span>}
              </span>
              <form action={(fd) => startDelete(async () => { await deleteTimeOffFromGrafikAction(fd); })}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  disabled={deleting}
                  aria-label={`Usuń nieobecność — ${t.staffName}`}
                  className="px-1 text-lg leading-none text-zinc-600 transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {showConflicts && state.status === "ok" && state.conflicts.length > 0 && (
        <TimeOffConflicts
          conflicts={state.conflicts}
          allStaff={allStaff}
          onClose={() => setShowConflicts(false)}
        />
      )}
    </div>
  );
}
