"use client";

import { useActionState, useState } from "react";
import type { ServiceFormState } from "./actions";
import type { Service } from "@/lib/types";

const DURATION_PRESETS = [15, 30, 45, 60, 75, 90, 120];

export function ServiceForm({
  action,
  service,
}: {
  action: (prev: ServiceFormState, fd: FormData) => Promise<ServiceFormState>;
  service?: Service;
}) {
  const [state, formAction, pending] = useActionState<ServiceFormState, FormData>(
    action,
    { status: "idle" }
  );
  const [isGroup, setIsGroup] = useState(service?.is_group ?? false);

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      <Field
        label="Nazwa usługi"
        name="name"
        required
        defaultValue={service?.name}
        error={state.status === "error" ? state.fieldErrors?.name : undefined}
      />

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">Opis <span className="text-zinc-500">(opcjonalny)</span></span>
        <textarea
          name="description"
          rows={3}
          defaultValue={service?.description ?? ""}
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-300">
            Czas trwania <span className="text-[var(--color-accent)]">*</span>
          </span>
          <div className="flex flex-wrap gap-2 mb-2">
            {DURATION_PRESETS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={(e) => {
                  const input = e.currentTarget.closest("label")?.querySelector("input");
                  if (input) input.value = String(min);
                }}
                className="rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
              >
                {min} min
              </button>
            ))}
          </div>
          <input
            type="number"
            name="duration_min"
            required
            min={5}
            max={480}
            step={5}
            defaultValue={service?.duration_min ?? 30}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
          />
          {state.status === "error" && state.fieldErrors?.duration_min && (
            <span className="mt-1 block text-xs text-red-400">{state.fieldErrors.duration_min}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-300">
            Cena (zł) <span className="text-[var(--color-accent)]">*</span>
          </span>
          <input
            type="number"
            name="price_pln"
            required
            min={0}
            max={9999}
            defaultValue={service?.price_pln ?? 0}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
          />
          {state.status === "error" && state.fieldErrors?.price_pln && (
            <span className="mt-1 block text-xs text-red-400">{state.fieldErrors.price_pln}</span>
          )}
        </label>
      </div>

      <Field
        label="Kolejność wyświetlania"
        name="sort_order"
        type="number"
        defaultValue={String(service?.sort_order ?? 0)}
        hint="Niższy numer = wyżej na liście"
      />

      {/* GROUP CLASS TOGGLE */}
      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4 space-y-3">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <span className="block text-sm font-medium text-zinc-200">Zajęcia grupowe</span>
            <span className="block text-xs text-zinc-500 mt-0.5">Wiele osób może zarezerwować ten sam termin</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isGroup}
            onClick={() => setIsGroup((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              isGroup ? "bg-[var(--color-accent)]" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isGroup ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <input type="hidden" name="is_group" value={isGroup ? "true" : "false"} />
        </label>

        {isGroup && (
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-300">
              Limit miejsc <span className="text-[var(--color-accent)]">*</span>
            </span>
            <input
              type="number"
              name="max_participants"
              required={isGroup}
              min={1}
              max={500}
              defaultValue={service?.max_participants ?? 10}
              className="w-32 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
            />
            <span className="ml-2 text-xs text-zinc-500">osób max</span>
            {state.status === "error" && state.fieldErrors?.max_participants && (
              <span className="mt-1 block text-xs text-red-400">{state.fieldErrors.max_participants}</span>
            )}
          </label>
        )}
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {pending ? "Zapisuję…" : service ? "Zapisz zmiany" : "Dodaj usługę"}
        </button>
        <a
          href="/admin/uslugi"
          className="rounded-full border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
        >
          Anuluj
        </a>
      </div>
    </form>
  );
}

function Field({
  label, name, type = "text", required, defaultValue, hint, error,
}: {
  label: string; name: string; type?: string; required?: boolean;
  defaultValue?: string; hint?: string; error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">
        {label}{required && <span className="text-[var(--color-accent)]"> *</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
      />
      {hint && !error && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
