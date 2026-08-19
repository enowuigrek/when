"use client";

import { useState, useTransition, useRef, useEffect, useActionState } from "react";
import { updateDayScheduleAction, addTimeOffFromGrafikAction, deleteTimeOffFromGrafikAction, type AddTimeOffState } from "./grafik-actions";
import type { StaffScheduleRow, StaffTimeOff } from "@/lib/db/staff-schedule";
import { TimeOffConflicts } from "./time-off-conflicts";
import { TimeOffForm } from "./time-off-form";
import { fieldClasses } from "@/components/ui/field";

type Staff = { id: string; name: string; color: string };

type Props = {
  staffId: string;
  staffColor: string;
  dayOfWeek: number; // 0=Sun…6=Sat
  dateStr: string; // YYYY-MM-DD concrete date for this cell
  scheduleRow: StaffScheduleRow | undefined;
  timeOff: StaffTimeOff | undefined; // any active time-off on this date
  businessOpen: string | null; // "HH:MM" fallback
  businessClose: string | null;
  allStaff: Staff[];
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

/** The anchored card's footprint, used to keep it inside the viewport. */
const POPOVER_W = 288;
const POPOVER_MAX_H = 380;

/**
 * The cell's card: a sheet on a phone, an anchored popover on a desktop.
 *
 * Anchoring to the cell works when there is room beside it. On a phone the
 * grid is already scrolled sideways and the cell you tapped is often at the
 * edge, so an anchored card opened half off-screen — the whole form was there
 * but you could not see it. Below `sm` it becomes a centred sheet over a
 * backdrop instead, which needs no room at all.
 */
function CellCard({
  style,
  width,
  onClose,
  children,
}: {
  style: { top: number; left: number };
  width: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 639px)");
    const sync = () => setSheet(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  if (sheet) {
    return (
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onClose}
      >
        <div
          className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[300] max-h-[85dvh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
      style={{ top: style.top, left: style.left, width }}
    >
      {children}
    </div>
  );
}

export function GrafikCell({ staffId, staffColor, dayOfWeek, dateStr, scheduleRow, timeOff, businessOpen, businessClose, allStaff }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("schedule");
  const [pending, start] = useTransition();
  const [popupStyle, setPopupStyle] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [timeOffState, timeOffAction, timeOffPending] = useActionState<AddTimeOffState, FormData>(
    addTimeOffFromGrafikAction,
    { status: "idle" }
  );
  const [showConflicts, setShowConflicts] = useState(false);

  useEffect(() => {
    if (timeOffState.status === "ok") {
      setOpen(false);
      if (timeOffState.conflicts.length > 0) setShowConflicts(true);
    }
  }, [timeOffState]);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // Viewport coordinates, not document ones: the card is position:fixed,
      // and the panel scrolls its <main>, not the window.
      //
      // Clamped to the viewport on both axes. Anchoring to the cell's centre
      // sent the card off the right edge in the last column, and a cell near
      // the bottom opened a card that ran past the fold with its buttons on it.
      const w = POPOVER_W;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - w - 8);
      const below = rect.bottom + 4;
      const top = below + POPOVER_MAX_H > window.innerHeight
        ? Math.max(8, window.innerHeight - POPOVER_MAX_H - 8)
        : below;
      setPopupStyle({ top, left });
    }
    setTab("schedule");
    setOpen((v) => !v);
  }

  // Derive display state
  const isWorking = !timeOff && (scheduleRow ? !!(scheduleRow.start_time && scheduleRow.end_time) : true);
  const currentStart = fmt(scheduleRow?.start_time) || businessOpen || "09:00";
  const currentEnd = fmt(scheduleRow?.end_time) || businessClose || "18:00";
  const isDefault = !scheduleRow; // no row = uses business hours

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={handleToggle}
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

      {open && !timeOff && popupStyle && (
        <CellCard style={popupStyle} width={POPOVER_W} onClose={() => setOpen(false)}>
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
                  className={fieldClasses({ size: "sm", className: "font-mono" })}
                />
                <span className="text-zinc-600">–</span>
                <input
                  type="time"
                  name="end"
                  defaultValue={currentEnd}
                  className={fieldClasses({ size: "sm", className: "font-mono" })}
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
            <TimeOffForm
              staffId={staffId}
              defaultDate={dateStr}
              action={timeOffAction}
              pending={timeOffPending}
              onCancel={() => setOpen(false)}
            />
          )}
        </CellCard>
      )}

      {open && timeOff && popupStyle && (
        <CellCard style={popupStyle} width={256} onClose={() => setOpen(false)}>
          <div className="text-sm text-zinc-300">
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
        </CellCard>
      )}

      {showConflicts && timeOffState.status === "ok" && timeOffState.conflicts.length > 0 && (
        <TimeOffConflicts
          conflicts={timeOffState.conflicts}
          allStaff={allStaff}
          onClose={() => setShowConflicts(false)}
        />
      )}

    </div>
  );
}
