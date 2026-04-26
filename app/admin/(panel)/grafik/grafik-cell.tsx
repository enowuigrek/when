"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { updateDayScheduleAction } from "./grafik-actions";
import type { StaffScheduleRow, StaffTimeOff } from "@/lib/db/staff-schedule";

type Props = {
  staffId: string;
  staffColor: string;
  dayOfWeek: number; // 0=Sun…6=Sat
  scheduleRow: StaffScheduleRow | undefined;
  timeOff: StaffTimeOff | undefined; // any active time-off on this date
  businessOpen: string | null; // "HH:MM" fallback
  businessClose: string | null;
};

function fmt(t: string | null | undefined) {
  return t ? t.slice(0, 5) : "";
}

const TYPE_LABELS = { sick: "L4", vacation: "Urlop", personal: "Prywatne", other: "Inne" };
const TYPE_COLORS: Record<string, string> = {
  sick: "text-red-400",
  vacation: "text-emerald-400",
  personal: "text-blue-400",
  other: "text-zinc-400",
};

export function GrafikCell({ staffId, staffColor, dayOfWeek, scheduleRow, timeOff, businessOpen, businessClose }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Derive display state
  const isWorking = !timeOff && (scheduleRow ? !!(scheduleRow.start_time && scheduleRow.end_time) : true);
  const currentStart = fmt(scheduleRow?.start_time) || businessOpen || "09:00";
  const currentEnd = fmt(scheduleRow?.end_time) || businessClose || "18:00";
  const isDefault = !scheduleRow; // no row = uses business hours

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full rounded-lg border px-2 py-2 text-left text-xs transition-colors ${
          timeOff
            ? `border-zinc-700 bg-zinc-900/40 ${TYPE_COLORS[timeOff.type]}`
            : isWorking
            ? "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600"
            : "border-zinc-800/40 bg-transparent text-zinc-700 hover:border-zinc-700"
        }`}
      >
        {timeOff ? (
          <span className="font-medium">{TYPE_LABELS[timeOff.type]}</span>
        ) : isWorking ? (
          <>
            <span className="font-mono">{currentStart}–{currentEnd}</span>
            {isDefault && <span className="ml-1 text-zinc-600">(domyślne)</span>}
          </>
        ) : (
          <span>wolny</span>
        )}
      </button>

      {open && !timeOff && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
          <form
            action={(fd) => start(async () => { await updateDayScheduleAction(fd); setOpen(false); })}
            className="space-y-3"
          >
            <input type="hidden" name="staffId" value={staffId} />
            <input type="hidden" name="dow" value={dayOfWeek} />

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                name="working"
                value="1"
                defaultChecked={isWorking}
                className="accent-[var(--color-accent)]"
              />
              Pracuje
            </label>

            <div className="flex items-center gap-2">
              <input
                type="time"
                name="start"
                defaultValue={currentStart}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
              <span className="text-zinc-600">–</span>
              <input
                type="time"
                name="end"
                defaultValue={currentEnd}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-600 hover:text-zinc-400">Anuluj</button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-full px-3 py-1 text-xs font-medium text-zinc-950 disabled:opacity-50"
                style={{ backgroundColor: staffColor }}
              >
                {pending ? "…" : "Zapisz"}
              </button>
            </div>
          </form>
        </div>
      )}

      {open && timeOff && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl text-sm text-zinc-300">
          <p className="font-medium">{TYPE_LABELS[timeOff.type]}</p>
          <p className="mt-1 font-mono text-xs text-zinc-500">{timeOff.start_date} — {timeOff.end_date}</p>
          {timeOff.note && <p className="mt-1 text-xs text-zinc-500">{timeOff.note}</p>}
          <button onClick={() => setOpen(false)} className="mt-3 text-xs text-zinc-600 hover:text-zinc-400">Zamknij</button>
        </div>
      )}
    </div>
  );
}
