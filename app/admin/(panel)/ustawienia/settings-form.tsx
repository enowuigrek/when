"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/db/settings";
import { updateSettingsAction, type SettingsFormState } from "./actions";

const THEMES = [
  { value: "dark", label: "Ciemny" },
  { value: "light", label: "Jasny" },
] as const;

const GRANULARITY_OPTIONS = [5, 10, 15, 20, 30];

type Tab = "firma" | "narzedzie";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(
    updateSettingsAction,
    { status: "idle" }
  );
  const [accentColor, setAccentColor] = useState(settings.color_accent ?? "#d4a26a");
  const [theme, setTheme] = useState<"dark" | "light">(
    (settings.theme === "dark" || settings.theme === "light") ? settings.theme : "dark"
  );
  const [activeTab, setActiveTab] = useState<Tab>("firma");
  const router = useRouter();

  // After successful save, force the layout to re-fetch settings so the
  // accent color / theme actually applies without a manual page reload.
  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state.status, router]);

  const err = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-6">
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

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border border-zinc-800 p-1 w-fit">
        {([["firma", "Moja firma"], ["narzedzie", "Narzędzie"]] as [Tab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: FIRMA ── */}
      <div className={activeTab === "firma" ? "space-y-6" : "hidden"}>
        <fieldset className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <legend className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Podstawowe
          </legend>

          <Field label="Nazwa firmy *" error={err.business_name}>
            <input name="business_name" defaultValue={settings.business_name} className={input} />
          </Field>

          <Field label="Tagline" error={err.tagline}>
            <input
              name="tagline"
              defaultValue={settings.tagline ?? ""}
              placeholder="Klasyka i precyzja. Bez pośpiechu."
              className={input}
            />
          </Field>

          <Field label="Opis (SEO, strona klienta)" error={err.description}>
            <textarea
              name="description"
              defaultValue={settings.description ?? ""}
              rows={3}
              className={`${input} resize-none`}
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <legend className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Kontakt i adres
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ulica" error={err.address_street}>
              <input name="address_street" defaultValue={settings.address_street ?? ""} className={input} />
            </Field>
            <Field label="Miasto" error={err.address_city}>
              <input name="address_city" defaultValue={settings.address_city ?? ""} className={input} />
            </Field>
            <Field label="Kod pocztowy" error={err.address_postal}>
              <input name="address_postal" defaultValue={settings.address_postal ?? ""} className={input} />
            </Field>
            <Field label="Telefon" error={err.phone}>
              <input name="phone" defaultValue={settings.phone ?? ""} className={input} />
            </Field>
          </div>

          <Field label="Email" error={err.email}>
            <input type="email" name="email" defaultValue={settings.email ?? ""} className={input} />
          </Field>

          <Field label="URL do Google Maps" error={err.maps_url}>
            <input name="maps_url" defaultValue={settings.maps_url ?? ""} placeholder="https://maps.google.com/?q=..." className={input} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instagram" error={err.instagram_url}>
              <input name="instagram_url" defaultValue={settings.instagram_url ?? ""} placeholder="https://instagram.com/..." className={input} />
            </Field>
            <Field label="Facebook" error={err.facebook_url}>
              <input name="facebook_url" defaultValue={settings.facebook_url ?? ""} placeholder="https://facebook.com/..." className={input} />
            </Field>
          </div>

          <Field label="Własna strona WWW" error={err.website_url}>
            <input name="website_url" defaultValue={settings.website_url ?? ""} placeholder="https://twojasalon.pl" className={input} />
          </Field>
        </fieldset>
      </div>

      {/* ── TAB: NARZĘDZIE ── */}
      <div className={activeTab === "narzedzie" ? "space-y-6" : "hidden"}>
        <fieldset className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <legend className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Wygląd
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kolor akcentu" error={err.color_accent}>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="color_accent"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-zinc-800 bg-zinc-900 p-0.5"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#d4a26a"
                  className={`${input} font-mono`}
                />
              </div>
            </Field>

            <Field label="Motyw" error={err.theme}>
              <input type="hidden" name="theme" value={theme} />
              <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTheme(t.value)}
                    className={`flex-1 py-2 text-sm transition-colors ${
                      theme === t.value
                        ? "bg-[var(--color-accent)] text-zinc-950 font-medium"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <legend className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Konfiguracja rezerwacji
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Granularność slotów (min)" error={err.slot_granularity_min}>
              <select name="slot_granularity_min" defaultValue={settings.slot_granularity_min} className={input}>
                {GRANULARITY_OPTIONS.map((v) => (
                  <option key={v} value={v}>{v} min</option>
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
      </div>

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
