"use client";

import { useActionState } from "react";
import type { Settings } from "@/lib/db/settings";
import { updateSettingsAction, type SettingsFormState } from "./actions";

const GRANULARITY_OPTIONS = [5, 10, 15, 20, 30];

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(
    updateSettingsAction,
    { status: "idle" }
  );

  const err = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-8">
      {state.status === "ok" && (
        <p className="rounded-lg bg-emerald-900/30 border border-emerald-700/50 px-4 py-3 text-sm text-emerald-300">
          Zapisano pomyślnie.
        </p>
      )}
      {state.status === "error" && !Object.keys(err).length && (
        <p className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      {/* Basic info */}
      <fieldset className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <legend className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
          Podstawowe
        </legend>

        <Field label="Nazwa firmy *" error={err.business_name}>
          <input
            name="business_name"
            defaultValue={settings.business_name}
            className={input}
          />
        </Field>

        <Field label="Tagline" error={err.tagline}>
          <input
            name="tagline"
            defaultValue={settings.tagline ?? ""}
            placeholder="Klasyka i precyzja. Bez pośpiechu."
            className={input}
          />
        </Field>

        <Field label="Opis (meta, landing page)" error={err.description}>
          <textarea
            name="description"
            defaultValue={settings.description ?? ""}
            rows={3}
            className={`${input} resize-none`}
          />
        </Field>
      </fieldset>

      {/* Contact */}
      <fieldset className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <legend className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
          Kontakt i adres
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ulica" error={err.address_street}>
            <input
              name="address_street"
              defaultValue={settings.address_street ?? ""}
              className={input}
            />
          </Field>
          <Field label="Miasto" error={err.address_city}>
            <input
              name="address_city"
              defaultValue={settings.address_city ?? ""}
              className={input}
            />
          </Field>
          <Field label="Kod pocztowy" error={err.address_postal}>
            <input
              name="address_postal"
              defaultValue={settings.address_postal ?? ""}
              className={input}
            />
          </Field>
          <Field label="Telefon" error={err.phone}>
            <input
              name="phone"
              defaultValue={settings.phone ?? ""}
              className={input}
            />
          </Field>
        </div>

        <Field label="Email" error={err.email}>
          <input
            type="email"
            name="email"
            defaultValue={settings.email ?? ""}
            className={input}
          />
        </Field>

        <Field label="URL do Google Maps" error={err.maps_url}>
          <input
            name="maps_url"
            defaultValue={settings.maps_url ?? ""}
            placeholder="https://maps.google.com/?q=..."
            className={input}
          />
        </Field>

        <Field label="URL Instagram" error={err.instagram_url}>
          <input
            name="instagram_url"
            defaultValue={settings.instagram_url ?? ""}
            placeholder="https://instagram.com/..."
            className={input}
          />
        </Field>
      </fieldset>

      {/* Booking config */}
      <fieldset className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <legend className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
          Konfiguracja rezerwacji
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Granularność slotów (min)" error={err.slot_granularity_min}>
            <select name="slot_granularity_min" defaultValue={settings.slot_granularity_min} className={input}>
              {GRANULARITY_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v} min
                </option>
              ))}
            </select>
          </Field>

          <Field label="Horyzont rezerwacji (dni)" error={err.booking_horizon_days}>
            <input
              type="number"
              name="booking_horizon_days"
              defaultValue={settings.booking_horizon_days}
              min={1}
              max={90}
              className={input}
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {pending ? "Zapisuję…" : "Zapisz ustawienia"}
        </button>
      </div>
    </form>
  );
}

const input =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-zinc-400">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
