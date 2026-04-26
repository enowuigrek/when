"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { updateDayScheduleAction, addTimeOffFromGrafikAction, deleteTimeOffFromGrafikAction } from "./grafik-actions";
import type { StaffScheduleRow, StaffTimeOff } from "@/lib/db/staff-schedule";

type Props = {
  staffId: string;
  staffColor: string;
  dayOfWeek: number; // 0=Sun…6=Sat
  dateStr: string; // YYYY-MM-DD concrete date for this cell
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

type Tab = "schedule" | "timeoff";

export function GrafikCell({ staffId, staffColor, dayOfWeek, dateStr, scheduleRow, timeOff, businessOpen, businessClose }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("schedule");
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
        onClick={() => { setTab("schedule"); setOpen((v) => !v); }}
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
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
          {/* Tab switcher */}
          <div className="mb-3 flex gap-1 rounded-md border border-zinc-800 p-0.5">
            <button
              type="button"
              onClick={() => setTab("schedule")}
              className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
                tab === "schedule" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Godziny pracy
            </button>
            <button
              type="button"
              onClick={() => setTab("timeoff")}
              className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
                tab === "timeoff" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Nieobecność
            </button>
          </div>

          {tab === "schedule" && (
            <form
              action={(fd) => start(async () => { await updateDayScheduleAction(fd); setOpen(false); })}
              className="space-y-3"
            >
              <input type="hidden" name="staffId" value={staffId} />
              <input type="hidden" name="dow" value={dayOfWeek} />

              <p className="text-xs text-zinc-500">Ustawia powtarzający się grafik dla tego dnia tygodnia.</p>

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
          )}

          {tab === "timeoff" && (
            <form
              action={(fd) => start(async () => { await addTimeOffFromGrafikAction(fd); setOpen(false); })}
              className="space-y-3"
            >
              <input type="hidden" name="staffId" value={staffId} />
              <input type="hidden" name="start_date" value={dateStr} />

              <div>
                <label className="mb-1 block text-xs text-zinc-500">Typ</label>
                <select
                  name="type"
                  defaultValue="vacation"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                >
                  <option value="vacation">Urlop</option>
                  <option value="sick">L4 (chorobowe)</option>
                  <option value="personal">Sprawy prywatne</option>
                  <option value="other">Inne</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-zinc-500">Od</label>
                  <input
                    type="date"
                    value={dateStr}
                    readOnly
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 font-mono text-sm text-zinc-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-zinc-500">Do (opcj.)</label>
                  <input
                    type="date"
                    name="end_date"
                    min={dateStr}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-500">Notatka (opcj.)</label>
                <input
                  type="text"
                  name="note"
                  placeholder="np. wyjazd"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-600 hover:text-zinc-400">Anuluj</button>
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
        </div>
      )}

      {open && timeOff && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl text-sm text-zinc-300">
          <p className="font-medium">{TYPE_LABELS[timeOff.type]}</p>
          <p className="mt-1 font-mono text-xs text-zinc-500">{timeOff.start_date} — {timeOff.end_date}</p>
          {timeOff.note && <p className="mt-1 text-xs text-zinc-500">{timeOff.note}</p>}

          <div className="mt-3 flex items-center justify-between gap-2">
            <button onClick={() => setOpen(false)} className="text-xs text-zinc-600 hover:text-zinc-400">Zamknij</button>
            <form action={(fd) => start(async () => { await deleteTimeOffFromGrafikAction(fd); setOpen(false); })}>
              <input type="hidden" name="id" value={timeOff.id} />
              <button
                type="submit"
                disabled={pending}
                className="rounded-full border border-red-900/50 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-900/20 disabled:opacity-50"
              >
                {pending ? "…" : "Usuń"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
