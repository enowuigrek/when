"use client";

import { useActionState, useState, useTransition } from "react";
import type { Slot } from "@/lib/slots";
import type { TimeFilter } from "@/lib/db/settings";
import { CalendarPicker } from "@/components/calendar-picker";
import { submitBooking } from "./actions";
import type { BookingFormState } from "./actions";

async function fetchSlots(
  serviceSlug: string,
  date: string,
  staffId: string | null
): Promise<{ ok: true; slots: Slot[] } | { ok: false; message: string }> {
  const params = new URLSearchParams({ service: serviceSlug, date });
  if (staffId) params.set("staff", staffId);
  const res = await fetch(`/api/slots?${params}`);
  return res.json();
}

type Day = { date: string; closed: boolean };
type StaffOption = { id: string; name: string; color: string };

export function BookingFlow({
  serviceSlug,
  days,
  initialDate,
  initialSlots,
  timeFilters,
  today,
  staff,
  staffUnavailable,
  isGroup = false,
  initialStaffId = null,
}: {
  serviceSlug: string;
  days: Day[];
  initialDate: string;
  initialSlots: Slot[];
  timeFilters: TimeFilter[];
  today: string;
  staff: StaffOption[];
  staffUnavailable: Record<string, string[]>;
  isGroup?: boolean;
  initialStaffId?: string | null;
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(initialStaffId);
  const [loadingSlots, startSlotLoad] = useTransition();

  const [formState, formAction, formPending] = useActionState<BookingFormState, FormData>(
    submitBooking,
    { status: "idle" }
  );

  function reloadSlots(date: string, staffId: string | null) {
    setSelectedSlot(null);
    setActiveFilter(null);
    startSlotLoad(async () => {
      const res = await fetchSlots(serviceSlug, date, staffId);
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
  const daysWithLeave: Day[] = unavailableSet
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
    <div className="mt-8 space-y-10">
      {/* STAFF PICKER — only for individual services with >1 staff */}
      {!isGroup && staff.length > 1 && (
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
            Pracownik
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => pickStaff(null)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
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
                  title={unavailableToday ? "Niedostępny tego dnia" : undefined}
                  className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    selectedStaffId === s.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : unavailableToday
                      ? "border-zinc-800/60 text-zinc-600 opacity-60"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color, opacity: unavailableToday ? 0.4 : 1 }}
                  />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CALENDAR */}
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
          Wybierz dzień
        </h2>
        <CalendarPicker days={daysWithLeave} selectedDate={selectedDate} onPick={pickDate} today={today} />
      </div>

      {/* SLOTS */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
            Wolne godziny
          </h2>
          {timeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {timeFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === f.id ? null : f.id)}
                  className={`rounded-full border px-3 py-0.5 text-xs transition-colors ${
                    activeFilter === f.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
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
          <p className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 text-sm text-zinc-400">
            {slots.length === 0
              ? "Brak terminów tego dnia. Wybierz inny."
              : "Brak terminów w tym przedziale — spróbuj inny filtr."}
          </p>
        ) : (
          <div className={`grid gap-2 ${isGroup ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"}`}>
            {visibleSlots.map((s) => {
              const isSelected = s.startsAtIso === selectedSlot?.startsAtIso;
              const isTaken = s.available === false;
              return (
                <button
                  key={s.startsAtIso}
                  type="button"
                  disabled={isTaken}
                  onClick={() => !isTaken && setSelectedSlot(s)}
                  title={isTaken ? (isGroup ? "Brak wolnych miejsc" : "Termin zajęty") : undefined}
                  className={`rounded-md border transition-colors ${isGroup ? "px-3 py-2.5" : "py-2"} ${
                    isTaken
                      ? "cursor-not-allowed border-zinc-800/40 bg-zinc-900/20 text-zinc-600"
                      : isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-zinc-950"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900"
                  }`}
                >
                  <span className={`block font-mono text-sm ${isTaken && isGroup ? "line-through" : ""}`}>{s.label}</span>
                  {isGroup && s.maxParticipants != null && (
                    <span className={`mt-0.5 block text-xs ${
                      isTaken
                        ? "text-zinc-700"
                        : isSelected
                        ? "text-zinc-800"
                        : s.spotsLeft != null && s.spotsLeft <= 3
                        ? "text-amber-400"
                        : "text-zinc-500"
                    }`}>
                      {isTaken
                        ? "brak miejsc"
                        : `${s.spotsLeft}/${s.maxParticipants} miejsc`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CUSTOMER FORM */}
      {selectedSlot && (
        <form action={formAction} className="space-y-5">
          <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
            <span className="font-mono text-[var(--color-accent)]">03</span>
            <span>Dane kontaktowe</span>
          </div>
          <p className="text-sm text-zinc-400">
            Rezerwujesz na{" "}
            <span className="text-zinc-200">
              {selectedDate} o godz. {selectedSlot.label}
            </span>
            .
          </p>

          <input type="hidden" name="serviceSlug" value={serviceSlug} />
          <input type="hidden" name="startsAtIso" value={selectedSlot.startsAtIso} />
          {selectedStaffId && <input type="hidden" name="staffId" value={selectedStaffId} />}

          <Field
            label="Imię i nazwisko"
            name="customerName"
            required
            error={formState.status === "error" ? formState.fieldErrors?.customerName : undefined}
          />
          <Field
            label="Telefon"
            name="customerPhone"
            type="tel"
            required
            error={formState.status === "error" ? formState.fieldErrors?.customerPhone : undefined}
          />
          <Field
            label="Email"
            name="customerEmail"
            type="email"
            hint="Opcjonalnie — wyślemy potwierdzenie."
            error={formState.status === "error" ? formState.fieldErrors?.customerEmail : undefined}
          />
          <Field label="Uwagi" name="notes" as="textarea" hint="Coś co barber powinien wiedzieć?" />

          {formState.status === "error" && (
            <p className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
              {formState.message}
            </p>
          )}

          <button
            type="submit"
            disabled={formPending}
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-6 py-3 font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {formPending ? "Rezerwuję…" : "Potwierdź rezerwację"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  hint,
  error,
  as,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  as?: "textarea";
}) {
  const base = "w-full rounded-md border bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2";
  const state = error
    ? "border-red-700 focus:ring-red-700/50"
    : "border-zinc-800 focus:border-zinc-600 focus:ring-zinc-700/50";
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">
        {label}
        {required && <span className="text-[var(--color-accent)]"> *</span>}
      </span>
      {as === "textarea" ? (
        <textarea name={name} rows={3} className={`${base} ${state}`} />
      ) : (
        <input type={type} name={name} required={required} className={`${base} ${state}`} />
      )}
      {hint && !error && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
