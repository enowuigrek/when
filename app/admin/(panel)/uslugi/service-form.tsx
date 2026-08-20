"use client";

import { useActionState, useState } from "react";
import { fieldClasses } from "@/components/ui/field";
import type { ServiceFormState } from "./actions";
import type { Service } from "@/lib/types";
import { Toggle } from "@/components/ui/toggle";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAdminBase } from "@/lib/use-admin-base";
import { lessonsLabel } from "@/lib/service-label";

export function ServiceForm({
  action,
  service,
}: {
  action: (prev: ServiceFormState, fd: FormData) => Promise<ServiceFormState>;
  service?: Service;
}) {
  const adminBase = useAdminBase();
  const [state, formAction, pending] = useActionState<ServiceFormState, FormData>(
    action,
    { status: "idle" }
  );
  const [isPackage, setIsPackage] = useState((service?.total_lessons ?? null) !== null);
  const [duration, setDuration] = useState(service?.duration_min ?? 30);
  const [lessons, setLessons] = useState(service?.total_lessons ?? 5);

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
          className={fieldClasses()}
        />
      </label>

      {/* PACKAGE TOGGLE */}
      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4 space-y-3">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <span className="block text-sm font-medium text-zinc-200">To pakiet lekcji</span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Kilka lekcji sprzedawanych za jedną cenę — terminy ustalacie po kolei
            </span>
          </div>
          <Toggle checked={isPackage} onChange={setIsPackage} label="To pakiet lekcji" />
          <input type="hidden" name="is_package" value={isPackage ? "true" : "false"} />
        </label>

        {isPackage && (
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-300">
              Liczba lekcji w pakiecie <span className="text-[var(--color-accent)]">*</span>
            </span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                name="total_lessons"
                required={isPackage}
                min={2}
                max={100}
                value={lessons}
                onChange={(e) => setLessons(Number(e.target.value))}
                // w-32 alone loses to the w-full inside fieldClasses — same
                // specificity, and Tailwind's own ordering decides. A wrapper
                // with a fixed basis sidesteps the fight.
                className={fieldClasses({ className: "!w-20" })}
              />
              <span className="text-sm text-zinc-500">lekcji</span>
            </span>
            {/* Nothing is computed from this: the name and the price are what
                the school actually charges, typed as they are on its price
                list. Dividing one by the other would invent a per-lesson rate
                nobody sells. */}
            {/* The owner sees the shape of what they are selling without
                having to hold two fields in their head. */}
            <span className="mt-2 block text-xs text-zinc-500">
              Klient zobaczy: <span className="text-zinc-300">{lessonsLabel(lessons)} × {duration} min</span>
            </span>
            <span className="mt-1 block text-xs text-zinc-600">
              Cena poniżej dotyczy całego pakietu. Terminy kolejnych lekcji ustalacie
              po drodze — nikt nie musi podawać wszystkich dat z góry.
            </span>
            {state.status === "error" && state.fieldErrors?.total_lessons && (
              <span className="mt-1 block text-xs text-red-400">{state.fieldErrors.total_lessons}</span>
            )}
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-300">
            {isPackage ? "Czas jednej lekcji" : "Czas trwania"}{" "}
            <span className="text-[var(--color-accent)]">*</span>
          </span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              name="duration_min"
              required
              min={5}
              max={480}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={fieldClasses({ className: "!w-20" })}
            />
            <span className="text-sm text-zinc-500">min</span>
          </span>
          {state.status === "error" && state.fieldErrors?.duration_min && (
            <span className="mt-1 block text-xs text-red-400">{state.fieldErrors.duration_min}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-300">
            {isPackage ? "Cena pakietu (zł)" : "Cena (zł)"}{" "}
            <span className="text-[var(--color-accent)]">*</span>
          </span>
          <input
            type="number"
            name="price_pln"
            required
            min={0}
            max={9999}
            defaultValue={service?.price_pln ?? 0}
            className={fieldClasses()}
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

      {/* Zajęcia grupowe i płatność online zdjęte z formularza — nikt ich
          dziś nie używa poza demem jogi, a dwie sekcje na dole przykrywały to,
          po co właściciel tu wchodzi. Wartości jadą dalej w ukrytych polach,
          więc edycja usługi nie kasuje tego, co już ustawione, a przywrócenie
          sekcji to jeden commit. */}
      <input type="hidden" name="is_group" value={service?.is_group ? "true" : "false"} />
      <input type="hidden" name="max_participants" value={service?.max_participants ?? 10} />
      <input type="hidden" name="payment_mode" value={service?.payment_mode ?? "none"} />
      <input type="hidden" name="deposit_amount_pln" value={service?.deposit_amount_pln ?? ""} />

      {state.status === "error" && !state.fieldErrors && (
        <p className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" radius="full" disabled={pending} className="px-5 py-2.5">
          {pending ? "Zapisuję…" : service ? "Zapisz zmiany" : "Dodaj usługę"}
        </Button>
        <ButtonLink href={`${adminBase}/uslugi`} variant="secondary" radius="full" className="px-5 py-2.5">
          Anuluj
        </ButtonLink>
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
        className={fieldClasses()}
      />
      {hint && !error && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
