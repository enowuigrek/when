"use client";

import { useActionState, useState, useTransition } from "react";
import type { Slot } from "@/lib/slots";
import type { Service } from "@/lib/types";
import type { TimeFilter } from "@/lib/db/settings";
import { getAdminSlotsForDate, createAdminBookingAction, type AdminBookingState } from "./actions";

type Day = {
  date: string;
  dow: number;
  dayLabel: string;
  dayNum: number;
  shortDate: string;
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
}: {
  services: Service[];
  days: Day[];
  initialDate: string;
  initialSlots: Slot[];
  timeFilters: TimeFilter[];
  granularityMin: number;
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
    if (date === selectedDate) return;
    setSelectedDate(date);
    setActiveFilter(null);
    loadSlots(selectedServiceId, date);
  }

  // Filter slots by active time filter.
  const visibleSlots = activeFilter
    ? (() => {
        const f = timeFilters.find((f) => f.id === activeFilter);
        if (!f) return slots;
        return slots.filter((s) => {
          const h = new Date(s.startsAtIso).getUTCHours();
          // Warsaw offset: +1 or +2 — we use the label from slot which is already Warsaw
          const [hStr] = s.label.split(":");
          const warsawH = Number(hStr);
          return warsawH >= f.from_hour && warsawH < f.to_hour;
        });
      })()
    : slots;

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;
  const err = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <div className="space-y-8">
      {/* SERVICE */}
      <div>
        <label className="mb-1.5 block text-sm text-zinc-400">
          Usługa <span className="text-[var(--color-accent)]">*</span>
        </label>
        <select
          value={selectedServiceId}
          onChange={(e) => pickService(e.target.value)}
          className={inp}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.duration_min} min · {s.price_pln} zł
            </option>
          ))}
        </select>
        {err.serviceId && <p className="mt-1 text-xs text-red-400">{err.serviceId}</p>}
      </div>

      {/* DAY STRIP */}
      <div>
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Wybierz dzień
        </p>
        <div className="-mx-6 overflow-x-auto px-6">
          <div className="flex gap-2 pb-2">
            {days.map((d) => {
              const isSelected = d.date === selectedDate;
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={d.closed}
                  onClick={() => pickDate(d.date)}
                  className={`flex min-w-[64px] flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors ${
                    d.closed
                      ? "cursor-not-allowed border-zinc-900 bg-zinc-900/30 text-zinc-600"
                      : isSelected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-zinc-100"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <span className="text-xs uppercase tracking-wider">{d.dayLabel}</span>
                  <span className="mt-1 text-lg font-semibold">{d.dayNum}</span>
                  {d.closed && <span className="mt-0.5 text-[10px] uppercase">zamk.</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SLOTS */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Wolne terminy
          </p>
          {timeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 ml-2">
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
              : "Brak terminów w wybranym przedziale — spróbuj inny filtr."}
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

        {err.startsAtIso && (
          <p className="mt-2 text-xs text-red-400">{err.startsAtIso}</p>
        )}
      </div>

      {/* CUSTOMER FORM — shows after slot is picked */}
      {selectedSlot && (
        <form action={formAction} className="space-y-5 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
          <div>
            <p className="text-sm font-medium text-zinc-300">
              Termin:{" "}
              <span className="text-[var(--color-accent)]">
                {selectedDate} · {selectedSlot.label}
              </span>
              {selectedService && (
                <span className="ml-2 text-zinc-500">
                  ({selectedService.name}, {selectedService.duration_min} min)
                </span>
              )}
            </p>
          </div>

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
      )}

      {!selectedSlot && (
        <div className="flex gap-3">
          <a
            href="/admin"
            className="rounded-full border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
          >
            Anuluj
          </a>
        </div>
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
  const inp =
    "w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50";
  return (
    <div>
      <label className="mb-1.5 block text-sm text-zinc-400">{label}</label>
      <input type={type} name={name} className={error ? `${inp} border-red-700` : inp} />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
