"use client";

import { useActionState, useState, useTransition } from "react";
import type { Slot } from "@/lib/slots";
import type { Service } from "@/lib/types";
import type { TimeFilter } from "@/lib/db/settings";
import { CalendarPicker } from "@/components/calendar-picker";
import { getAdminSlotsForDate, createAdminBookingAction, type AdminBookingState } from "./actions";

type Day = {
  date: string;
  closed: boolean;
};

const inp =
  "w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50";

export function AdminBookingForm({
  services,
  days,
  initialDate,
  initialSlots,
  timeFilters,
  today,
}: {
  services: Service[];
  days: Day[];
  initialDate: string;
  initialSlots: Slot[];
  timeFilters: TimeFilter[];
  granularityMin: number;
  today: string;
}) {
  const [state, formAction, formPending] = useActionState<AdminBookingState, FormData>(
    createAdminBookingAction,
    { status: "idle" }
  );

  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loadingSlots, startSlotLoad] = useTransition();

  function loadSlots(serviceId: string, date: string) {
    setSelectedSlot(null);
    startSlotLoad(async () => {
      const res = await getAdminSlotsForDate(serviceId, date);
      setSlots(res.ok ? res.slots : []);
    });
  }

  function pickService(id: string) {
    setSelectedServiceId(id);
    loadSlots(id, selectedDate);
  }

  function pickDate(date: string) {
    setSelectedDate(date);
    setActiveFilter(null);
    loadSlots(selectedServiceId, date);
  }

  const visibleSlots = activeFilter
    ? slots.filter((s) => {
        const f = timeFilters.find((f) => f.id === activeFilter);
        if (!f) return true;
        const warsawH = Number(s.label.split(":")[0]);
        return warsawH >= f.from_hour && warsawH < f.to_hour;
      })
    : slots;

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;
  const err = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <div className="space-y-8">
      {/* STEP 1 — SERVICE TILES */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          1 · Usługa
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => {
            const isSelected = s.id === selectedServiceId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pickService(s.id)}
                className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-medium leading-tight ${isSelected ? "text-zinc-100" : "text-zinc-200"}`}>
                    {s.name}
                  </p>
                  {s.description && (
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{s.description}</p>
                  )}
                  <p className="mt-1 font-mono text-xs text-zinc-500">{s.duration_min} min</p>
                </div>
                <div className={`shrink-0 font-mono text-lg font-semibold ${isSelected ? "text-[var(--color-accent)]" : "text-zinc-400"}`}>
                  {s.price_pln} zł
                </div>
              </button>
            );
          })}
        </div>
        {err.serviceId && <p className="mt-1 text-xs text-red-400">{err.serviceId}</p>}
      </div>

      {/* STEP 2 — CALENDAR */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          2 · Wybierz dzień
        </p>
        <CalendarPicker
          days={days}
          selectedDate={selectedDate}
          onPick={pickDate}
          today={today}
        />
      </div>

      {/* STEP 3 — SLOTS */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            3 · Godzina
          </p>
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
              ? "Brak wolnych terminów tego dnia."
              : "Brak terminów w tym przedziale — wybierz inny filtr."}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {visibleSlots.map((s) => {
              const isSelected = s.startsAtIso === selectedSlot?.startsAtIso;
              return (
                <button
                  key={s.startsAtIso}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`rounded-md border py-2 font-mono text-sm transition-colors ${
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-zinc-950 font-semibold"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
        {err.startsAtIso && <p className="mt-2 text-xs text-red-400">{err.startsAtIso}</p>}
      </div>

      {/* STEP 4 — CUSTOMER FORM */}
      {selectedSlot ? (
        <form action={formAction} className="space-y-5 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            4 · Dane klienta
          </p>
          <p className="text-sm text-zinc-400">
            {selectedService?.name} ·{" "}
            <span className="text-zinc-200">
              {selectedDate}, {selectedSlot.label}
            </span>
            {selectedService && (
              <span className="text-zinc-500"> ({selectedService.duration_min} min)</span>
            )}
          </p>

          <input type="hidden" name="serviceId" value={selectedServiceId} />
          <input type="hidden" name="startsAtIso" value={selectedSlot.startsAtIso} />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Imię i nazwisko *" name="customerName" error={err.customerName} />
            <Field label="Telefon *" name="customerPhone" type="tel" error={err.customerPhone} />
          </div>
          <Field label="Email (opcjonalny)" name="customerEmail" type="email" error={err.customerEmail} />
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">Uwagi</label>
            <textarea name="notes" rows={2} className={inp} />
          </div>

          {state.status === "error" && !Object.keys(err).length && (
            <p className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
              {state.message}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={formPending}
              className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            >
              {formPending ? "Rezerwuję…" : "Dodaj rezerwację"}
            </button>
            <a
              href="/admin"
              className="rounded-full border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
            >
              Anuluj
            </a>
          </div>
        </form>
      ) : (
        <a
          href="/admin"
          className="inline-block rounded-full border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
        >
          Anuluj
        </a>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-zinc-400">{label}</label>
      <input
        type={type}
        name={name}
        className={
          "w-full rounded-md border bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 " +
          (error
            ? "border-red-700 focus:ring-red-700/50"
            : "border-zinc-800 focus:border-zinc-600 focus:ring-zinc-700/50")
        }
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
