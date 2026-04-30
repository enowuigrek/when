"use client";

import { useActionState, useState, useTransition } from "react";
import type { Slot } from "@/lib/slots";
import type { TimeFilter } from "@/lib/db/settings";
import { CalendarPicker } from "@/components/calendar-picker";
import { submitWidgetBooking } from "./actions";
import type { WidgetBookingState } from "./actions";

type Day = { date: string; closed: boolean };
type StaffOption = { id: string; name: string; color: string };

async function fetchWidgetSlots(
  tenantSlug: string,
  serviceSlug: string,
  date: string,
  staffId: string | null
): Promise<{ ok: true; slots: Slot[] } | { ok: false; message: string }> {
  const params = new URLSearchParams({ tenant: tenantSlug, service: serviceSlug, date });
  if (staffId) params.set("staff", staffId);
  const res = await fetch(`/api/widget/slots?${params}`);
  return res.json();
}

const DOW_PL = ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."];
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const dow = DOW_PL[d.getUTCDay()];
  return `${dow} ${d.getUTCDate()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

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
  isEmbed = false,
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
  isEmbed?: boolean;
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
      const res = await fetchWidgetSlots(tenantSlug, serviceSlug, date, staffId);
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
    <div className="space-y-5">
      {/* STAFF PICKER */}
      {staff.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Pracownik</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => pickStaff(null)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
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
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                    selectedStaffId === s.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : unavailableToday
                      ? "border-zinc-800/60 text-zinc-600 opacity-50"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color, opacity: unavailableToday ? 0.4 : 1 }} />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CALENDAR */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Data</p>
        <CalendarPicker days={daysWithLeave} selectedDate={selectedDate} onPick={pickDate} today={today} />
      </div>

      {/* SLOTS */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Godzina</p>
          {timeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {timeFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === f.id ? null : f.id)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
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
          <p className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3 text-xs text-zinc-400">
            {slots.length === 0 ? "Brak terminów tego dnia. Wybierz inny." : "Brak terminów w tym przedziale."}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {visibleSlots.map((s) => {
              const isSelected = s.startsAtIso === selectedSlot?.startsAtIso;
              const isTaken = s.available === false;
              return (
                <button
                  key={s.startsAtIso}
                  type="button"
                  disabled={isTaken}
                  onClick={() => !isTaken && setSelectedSlot(s)}
                  className={`rounded-lg border py-2 font-mono text-xs font-medium transition-all ${
                    isTaken
                      ? "cursor-not-allowed border-zinc-800/30 text-zinc-700 line-through"
                      : isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-zinc-950 shadow-sm"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* BOOKING FORM — appears when slot selected */}
      {selectedSlot && (
        <form action={formAction} className="space-y-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
          {/* Selected time summary */}
          <div className="mb-1 flex items-center gap-2 rounded-lg bg-[var(--color-accent)]/10 px-3 py-2">
            <span className="text-sm font-medium text-[var(--color-accent)]">{formatDateLabel(selectedDate)}</span>
            <span className="text-zinc-500">·</span>
            <span className="font-mono text-sm text-[var(--color-accent)]">{selectedSlot.label}</span>
          </div>

          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="serviceSlug" value={serviceSlug} />
          <input type="hidden" name="startsAtIso" value={selectedSlot.startsAtIso} />
          {selectedStaffId && <input type="hidden" name="staffId" value={selectedStaffId} />}
          {isEmbed && <input type="hidden" name="embed" value="1" />}

          <Field
            label="Imię i nazwisko *"
            name="customerName"
            required
            placeholder="Jan Kowalski"
            error={formState.status === "error" ? formState.fieldErrors?.customerName : undefined}
          />
          <Field
            label="Telefon *"
            name="customerPhone"
            type="tel"
            required
            placeholder="+48 600 000 000"
            error={formState.status === "error" ? formState.fieldErrors?.customerPhone : undefined}
          />
          <Field
            label="Email"
            name="customerEmail"
            type="email"
            placeholder="opcjonalnie — do potwierdzenia"
            error={formState.status === "error" ? formState.fieldErrors?.customerEmail : undefined}
          />
          <Field label="Uwagi" name="notes" as="textarea" placeholder="Coś, co warto wiedzieć…" />

          {formState.status === "error" && (
            <p className="rounded-md border border-red-900/50 bg-red-950/30 p-2.5 text-xs text-red-300">
              {formState.message}
            </p>
          )}

          <button
            type="submit"
            disabled={formPending}
            className="w-full rounded-full bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {formPending ? "Rezerwuję…" : "Potwierdź rezerwację"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label, name, type = "text", required, placeholder, error, as,
}: {
  label: string; name: string; type?: string; required?: boolean;
  placeholder?: string; error?: string; as?: "textarea";
}) {
  const base = "w-full rounded-lg border bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-colors";
  const state = error ? "border-red-700" : "border-zinc-800 focus:border-zinc-600";
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-400">{label}</label>
      {as === "textarea"
        ? <textarea name={name} rows={2} placeholder={placeholder} className={`${base} ${state} resize-none`} />
        : <input type={type} name={name} required={required} placeholder={placeholder} className={`${base} ${state}`} />}
      {error && <p className="mt-0.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
