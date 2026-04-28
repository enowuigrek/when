"use client";

import { useActionState, useState, useTransition } from "react";
import type { Slot } from "@/lib/slots";
import type { TimeFilter } from "@/lib/db/settings";
import { CalendarPicker } from "@/components/calendar-picker";
import { getWidgetSlots, submitWidgetBooking } from "./actions";
import type { WidgetBookingState } from "./actions";

type Day = { date: string; closed: boolean };
type StaffOption = { id: string; name: string; color: string };

export function WidgetBookingFlow({
  tenantSlug,
  serviceSlug,
  days,
  initialDate,
  initialSlots,
  timeFilters,
  today,
  staff,
  staffUnavailable,
}: {
  tenantSlug: string;
  serviceSlug: string;
  days: Day[];
  initialDate: string;
  initialSlots: Slot[];
  timeFilters: TimeFilter[];
  today: string;
  staff: StaffOption[];
  staffUnavailable: Record<string, string[]>;
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [loadingSlots, startSlotLoad] = useTransition();

  const [formState, formAction, formPending] = useActionState<WidgetBookingState, FormData>(
    submitWidgetBooking,
    { status: "idle" }
  );

  function reloadSlots(date: string, staffId: string | null) {
    setSelectedSlot(null);
    setActiveFilter(null);
    startSlotLoad(async () => {
      const res = await getWidgetSlots(tenantSlug, serviceSlug, date, staffId);
      setSlots(res.ok ? res.slots : []);
    });
  }

  function pickDate(date: string) {
    setSelectedDate(date);
    reloadSlots(date, selectedStaffId);
  }

  function pickStaff(staffId: string | null) {
    setSelectedStaffId(staffId);
    reloadSlots(selectedDate, staffId);
  }

  const unavailableSet = selectedStaffId ? new Set(staffUnavailable[selectedStaffId] ?? []) : null;
  const daysWithLeave = unavailableSet
    ? days.map((d) => (unavailableSet.has(d.date) ? { ...d, closed: true } : d))
    : days;

  const visibleSlots = activeFilter
    ? slots.filter((s) => {
        const f = timeFilters.find((f) => f.id === activeFilter);
        if (!f) return true;
        const h = Number(s.label.split(":")[0]);
        return h >= f.from_hour && h < f.to_hour;
      })
    : slots;

  return (
    <div className="mt-6 space-y-8">
      {/* STAFF PICKER */}
      {staff.length > 1 && (
        <div>
          <h2 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Pracownik</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => pickStaff(null)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                selectedStaffId === null
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              Dowolny
            </button>
            {staff.map((s) => {
              const unavailableToday = (staffUnavailable[s.id] ?? []).includes(selectedDate);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickStaff(s.id)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    selectedStaffId === s.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : unavailableToday
                      ? "border-zinc-800/60 text-zinc-600 opacity-60"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color, opacity: unavailableToday ? 0.4 : 1 }} />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CALENDAR */}
      <div>
        <h2 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Wybierz dzień</h2>
        <CalendarPicker days={daysWithLeave} selectedDate={selectedDate} onPick={pickDate} today={today} />
      </div>

      {/* SLOTS */}
      <div>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Wolne godziny</h2>
          {timeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {timeFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === f.id ? null : f.id)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    activeFilter === f.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loadingSlots ? (
          <p className="text-sm text-zinc-500">Ładowanie…</p>
        ) : visibleSlots.length === 0 ? (
          <p className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3 text-sm text-zinc-400">
            {slots.length === 0 ? "Brak terminów tego dnia." : "Brak terminów w tym przedziale."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {visibleSlots.map((s) => {
              const isSelected = s.startsAtIso === selectedSlot?.startsAtIso;
              const isTaken = s.available === false;
              return (
                <button
                  key={s.startsAtIso}
                  type="button"
                  disabled={isTaken}
                  onClick={() => !isTaken && setSelectedSlot(s)}
                  className={`rounded-md border py-2 font-mono text-sm transition-colors ${
                    isTaken
                      ? "cursor-not-allowed border-zinc-800/40 text-zinc-600 line-through"
                      : isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-zinc-950"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:border-zinc-600"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* BOOKING FORM */}
      {selectedSlot && (
        <form action={formAction} className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
          <p className="text-sm text-zinc-400">
            Rezerwujesz na{" "}
            <span className="text-zinc-200">
              {selectedDate}, godz. {selectedSlot.label}
            </span>
          </p>

          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="serviceSlug" value={serviceSlug} />
          <input type="hidden" name="startsAtIso" value={selectedSlot.startsAtIso} />
          {selectedStaffId && <input type="hidden" name="staffId" value={selectedStaffId} />}

          <Field label="Imię i nazwisko" name="customerName" required
            error={formState.status === "error" ? formState.fieldErrors?.customerName : undefined} />
          <Field label="Telefon" name="customerPhone" type="tel" required
            error={formState.status === "error" ? formState.fieldErrors?.customerPhone : undefined} />
          <Field label="Email" name="customerEmail" type="email" hint="Opcjonalnie — wyślemy potwierdzenie."
            error={formState.status === "error" ? formState.fieldErrors?.customerEmail : undefined} />
          <Field label="Uwagi" name="notes" as="textarea" />

          {formState.status === "error" && (
            <p className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
              {formState.message}
            </p>
          )}

          <button
            type="submit"
            disabled={formPending}
            className="w-full rounded-full bg-[var(--color-accent)] py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {formPending ? "Rezerwuję…" : "Potwierdź rezerwację"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label, name, type = "text", required, hint, error, as,
}: {
  label: string; name: string; type?: string; required?: boolean;
  hint?: string; error?: string; as?: "textarea";
}) {
  const base = "w-full rounded-md border bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";
  const state = error ? "border-red-700" : "border-zinc-800 focus:border-zinc-600";
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">
        {label}{required && <span className="text-[var(--color-accent)]"> *</span>}
      </span>
      {as === "textarea"
        ? <textarea name={name} rows={2} className={`${base} ${state}`} />
        : <input type={type} name={name} required={required} className={`${base} ${state}`} />}
      {hint && !error && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
