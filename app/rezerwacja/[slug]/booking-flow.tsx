"use client";

import { useActionState, useState, useTransition } from "react";
import type { Slot } from "@/lib/slots";
import { getSlotsForDate, submitBooking } from "./actions";
import type { BookingFormState } from "./actions";

type Day = {
  date: string;
  dow: number;
  dayLabel: string;
  dayNum: number;
  shortDate: string;
  closed: boolean;
};

export function BookingFlow({
  serviceSlug,
  days,
  initialDate,
  initialSlots,
}: {
  serviceSlug: string;
  days: Day[];
  initialDate: string;
  initialSlots: Slot[];
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, startSlotLoad] = useTransition();

  const [formState, formAction, formPending] = useActionState<
    BookingFormState,
    FormData
  >(submitBooking, { status: "idle" });

  function pickDate(date: string) {
    if (date === selectedDate) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    startSlotLoad(async () => {
      const res = await getSlotsForDate(serviceSlug, date);
      if (res.ok) setSlots(res.slots);
      else setSlots([]);
    });
  }

  return (
    <div className="mt-8 space-y-10">
      {/* DATE STRIP */}
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
          Wybierz dzień
        </h2>
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
                  <span className="text-xs uppercase tracking-wider">
                    {d.dayLabel}
                  </span>
                  <span className="mt-1 text-lg font-semibold">{d.dayNum}</span>
                  {d.closed && (
                    <span className="mt-1 text-[10px] uppercase">zamk.</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SLOTS */}
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
          Wolne godziny
        </h2>
        {loadingSlots ? (
          <p className="text-sm text-zinc-500">Ładowanie…</p>
        ) : slots.length === 0 ? (
          <p className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 text-sm text-zinc-400">
            Brak wolnych terminów tego dnia. Wybierz inny.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {slots.map((s) => {
              const isSelected = s.startsAtIso === selectedSlot?.startsAtIso;
              return (
                <button
                  key={s.startsAtIso}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`rounded-md border py-2 font-mono text-sm transition-colors ${
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-zinc-950"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900"
                  }`}
                >
                  {s.label}
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
          <input
            type="hidden"
            name="startsAtIso"
            value={selectedSlot.startsAtIso}
          />

          <Field
            label="Imię i nazwisko"
            name="customerName"
            required
            error={
              formState.status === "error"
                ? formState.fieldErrors?.customerName
                : undefined
            }
          />
          <Field
            label="Telefon"
            name="customerPhone"
            type="tel"
            required
            error={
              formState.status === "error"
                ? formState.fieldErrors?.customerPhone
                : undefined
            }
          />
          <Field
            label="Email"
            name="customerEmail"
            type="email"
            hint="Opcjonalnie — wyślemy potwierdzenie."
            error={
              formState.status === "error"
                ? formState.fieldErrors?.customerEmail
                : undefined
            }
          />
          <Field
            label="Uwagi"
            name="notes"
            as="textarea"
            hint="Coś co barber powinien wiedzieć?"
          />

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
  const baseClass =
    "w-full rounded-md border bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2";
  const stateClass = error
    ? "border-red-700 focus:ring-red-700/50"
    : "border-zinc-800 focus:border-zinc-600 focus:ring-zinc-700/50";

  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">
        {label}
        {required && <span className="text-[var(--color-accent)]"> *</span>}
      </span>
      {as === "textarea" ? (
        <textarea
          name={name}
          rows={3}
          className={`${baseClass} ${stateClass}`}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          className={`${baseClass} ${stateClass}`}
        />
      )}
      {hint && !error && (
        <span className="mt-1 block text-xs text-zinc-500">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs text-red-400">{error}</span>
      )}
    </label>
  );
}
