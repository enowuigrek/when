"use client";

import { useActionState, useEffect, useState } from "react";
import { saveClassGroupAction, deleteClassGroupAction, type SlotState } from "./slot-actions";
import { WEEKDAY_NAMES, WEEK_ORDER } from "@/lib/weekdays";

export type SlotRow = {
  id: string;
  dayOfWeek: number;
  /** "15:45" — already trimmed of seconds. */
  startTime: string;
  endTime: string;
  ageLabel: string | null;
  minParticipants: number | null;
  maxParticipants: number | null;
  active: boolean;
};

const WEEKDAYS = WEEK_ORDER.map((d) => [d, WEEKDAY_NAMES[d]] as const);

const field =
  "rounded-lg border border-zinc-800 bg-zinc-900/40 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-[var(--color-accent)]";

/**
 * When a course meets.
 *
 * The one thing about a course a studio changes on its own — a group shifts an
 * hour later, a new day opens in September — and until now it could only be
 * changed by editing a seed file.
 */
export function SlotEditor({
  serviceId,
  slots,
}: {
  serviceId: string;
  slots: SlotRow[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="mt-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      {slots.map((s) => (
        <SlotForm key={s.id} serviceId={serviceId} slot={s} />
      ))}

      {adding ? (
        <SlotForm serviceId={serviceId} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1 rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Dodaj dzień
        </button>
      )}
    </div>
  );
}

function SlotForm({
  serviceId,
  slot,
  onDone,
}: {
  serviceId: string;
  slot?: SlotRow;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<SlotState, FormData>(
    saveClassGroupAction,
    { status: "idle" }
  );
  const [removeState, removeAction, removing] = useActionState<SlotState, FormData>(
    deleteClassGroupAction,
    { status: "idle" }
  );

  // A new day, once saved, is in the list above; leaving its blank form open
  // under it is how the same Monday gets added twice.
  useEffect(() => {
    if (!slot && state.status === "ok") onDone?.();
  }, [slot, state.status, onDone]);

  // Switched off rather than deleted, because children are still booked into
  // it. Without saying so it would look like any day taking sign-ups.
  const off = slot ? !slot.active : false;

  return (
    <div
      className={`rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3 ${off ? "opacity-70" : ""}`}
    >
      {off && (
        <p className="mb-2 text-[11px] text-zinc-400">
          Wyłączony z zapisów — umówione spotkania zostają. Zapisz, żeby znów
          przyjmować zapisy na ten dzień.
        </p>
      )}
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        {slot && <input type="hidden" name="id" value={slot.id} />}
        <input type="hidden" name="serviceId" value={serviceId} />
        {off && <input type="hidden" name="active" value="true" />}

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Dzień</span>
          <select name="dayOfWeek" defaultValue={slot?.dayOfWeek ?? 1} className={field}>
            {WEEKDAYS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Od</span>
          <input
            name="startTime"
            type="time"
            required
            defaultValue={slot?.startTime ?? "15:45"}
            className={`${field} font-mono`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Do</span>
          <input
            name="endTime"
            type="time"
            required
            defaultValue={slot?.endTime ?? "17:15"}
            className={`${field} font-mono`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Etykieta</span>
          <input
            name="ageLabel"
            maxLength={60}
            placeholder="6–10 lat"
            defaultValue={slot?.ageLabel ?? ""}
            className={`${field} w-28`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Min</span>
          <input
            name="minParticipants"
            type="number"
            min={1}
            max={100}
            placeholder="5"
            defaultValue={slot?.minParticipants ?? ""}
            className={`${field} w-16 font-mono`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Max</span>
          <input
            name="maxParticipants"
            type="number"
            min={1}
            max={200}
            placeholder="—"
            defaultValue={slot?.maxParticipants ?? ""}
            className={`${field} w-16 font-mono`}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold text-[var(--color-accent-fg)] disabled:opacity-60"
        >
          {pending ? "Zapisuję…" : off ? "Zapisz i włącz" : slot ? "Zapisz" : "Dodaj"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            Anuluj
          </button>
        )}
      </form>

      {slot && (
        <form action={removeAction} className="mt-2">
          <input type="hidden" name="id" value={slot.id} />
          <button
            type="submit"
            disabled={removing}
            className="text-[11px] text-zinc-600 hover:text-red-400 disabled:opacity-60"
          >
            {removing ? "Usuwam…" : "Usuń dzień"}
          </button>
        </form>
      )}

      {(state.status !== "idle" || removeState.status !== "idle") && (
        <p
          className={`mt-2 text-xs ${
            state.status === "error" || removeState.status === "error"
              ? "text-red-400"
              : "text-emerald-400"
          }`}
        >
          {state.message ?? removeState.message}
        </p>
      )}
    </div>
  );
}
