"use client";

import { useActionState, useState } from "react";
import type { StaffScheduleRow } from "@/lib/db/staff-schedule";
import { saveStaffScheduleAction, type ScheduleState } from "./schedule-actions";
import { dayLabels } from "@/lib/business";

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0] as const; // Mon → Sun

function fmt(t: string | null | undefined) {
  return t ? t.slice(0, 5) : "";
}

export function StaffScheduleForm({
  staffId,
  schedule,
}: {
  staffId: string;
  schedule: StaffScheduleRow[];
}) {
  const [state, action, pending] = useActionState<ScheduleState, FormData>(
    saveStaffScheduleAction,
    { status: "idle" }
  );

  const getRow = (dow: number) => schedule.find((r) => r.day_of_week === dow);

  const [working, setWorking] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const dow of ORDERED_DAYS) {
      const r = getRow(dow);
      // No row = default working (uses business hours). Row with null times = not working.
      init[dow] = !r || (!!r.start_time && !!r.end_time);
    }
    return init;
  });

  const inputCls =
    "rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-30 w-24";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="staffId" value={staffId} />

      {state.status === "ok" && (
        <p className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-4 py-2 text-sm text-emerald-300">
          Grafik zapisany.
        </p>
      )}
      {state.status === "error" && (
        <p className="rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-2 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40">
        {ORDERED_DAYS.map((dow) => {
          const r = getRow(dow);
          const isWorking = working[dow];
          return (
            <div key={dow} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <input type="hidden" name={`working_${dow}`} value={isWorking ? "1" : "0"} />
              <span className="w-28 text-sm font-medium text-zinc-200">{dayLabels[dow]}</span>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={isWorking}
                  onChange={() => setWorking((p) => ({ ...p, [dow]: !p[dow] }))}
                  className="accent-[var(--color-accent)]"
                />
                Pracuje
              </label>

              <div className={`flex items-center gap-2 ${!isWorking ? "pointer-events-none opacity-30" : ""}`}>
                <input
                  type="time"
                  name={`start_${dow}`}
                  defaultValue={fmt(r?.start_time) || "09:00"}
                  disabled={!isWorking}
                  className={inputCls}
                />
                <span className="text-zinc-600">—</span>
                <input
                  type="time"
                  name={`end_${dow}`}
                  defaultValue={fmt(r?.end_time) || "18:00"}
                  disabled={!isWorking}
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
          {pending ? "Zapisuję…" : "Zapisz grafik"}
        </button>
      </div>
    </form>
  );
}
