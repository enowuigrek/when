"use client";

import { useActionState, useState } from "react";
import { fieldClasses } from "@/components/ui/field";
import type { ServiceFormState } from "./actions";
import type { Service } from "@/lib/types";
import { Toggle } from "@/components/ui/toggle";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAdminBase } from "@/lib/use-admin-base";
import { lessonsLabel, meetingsLabel } from "@/lib/service-label";
import { CLASS_COLORS, classColor } from "@/lib/class-colors";

export function ServiceForm({
  action,
  service,
  classes = false,
  backTo = "/uslugi",
}: {
  action: (prev: ServiceFormState, fd: FormData) => Promise<ServiceFormState>;
  service?: Service;
  /** The service meets on fixed weekdays: a studio's month, not a dance
      school's package whose dates are agreed one by one. Same fields, its
      own words. */
  classes?: boolean;
  /** Where "Anuluj" leads, under the admin base — back to the page the owner
      came from, not always the services list. */
  backTo?: string;
}) {
  const adminBase = useAdminBase();
  const [state, formAction, pending] = useActionState<ServiceFormState, FormData>(
    action,
    { status: "idle" }
  );
  const [isPackage, setIsPackage] = useState((service?.total_lessons ?? null) !== null);
  const [duration, setDuration] = useState(service?.duration_min ?? 30);
  const [lessons, setLessons] = useState(service?.total_lessons ?? 5);
  // What the class is drawn in now — its own colour, or the one it gets from
  // its place in the list — so the picker opens on what the schedule shows.
  const [color, setColor] = useState(() =>
    service ? classColor(service) : CLASS_COLORS[0].hex
  );
  const count = classes ? meetingsLabel : lessonsLabel;
  // "4 spotkania" → "spotkania": the word beside the number box has to agree
  // with the number in it, like the preview under it does.
  const unit = count(lessons).replace(/^\d+\s/, "");

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      <Field
        label={classes ? "Nazwa zajęć" : "Nazwa usługi"}
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

      {classes && (
        <fieldset>
          <legend className="mb-1 block text-sm text-zinc-300">Kolor zajęć</legend>
          <p className="mb-2 text-xs text-zinc-500">
            W tym kolorze zajęcia są w harmonogramie, w kalendarzu i przy zapisach.
          </p>
          <div className="flex flex-wrap gap-2">
            {CLASS_COLORS.map((c) => {
              const on = c.hex.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  aria-pressed={on}
                  aria-label={c.label}
                  title={c.label}
                  className={`h-11 w-11 rounded-full transition-transform ${
                    on ? "scale-110" : "hover:scale-105"
                  }`}
                  // An outline set off from the swatch reads on either theme,
                  // without having to know what colour the page behind is.
                  style={{
                    backgroundColor: c.hex,
                    outline: on ? `2px solid ${c.hex}` : undefined,
                    outlineOffset: 3,
                  }}
                />
              );
            })}
          </div>
          <input type="hidden" name="color" value={color} />
        </fieldset>
      )}

      {/* PACKAGE TOGGLE */}
      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4 space-y-3">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <span className="block text-sm font-medium text-zinc-200">
              {classes ? "Cena obejmuje kilka spotkań" : "To pakiet lekcji"}
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              {classes
                ? "Np. miesiąc to 4 spotkania — zapis zajmuje od razu wszystkie"
                : "Kilka lekcji sprzedawanych za jedną cenę — terminy ustalacie po kolei"}
            </span>
          </div>
          <Toggle
            checked={isPackage}
            onChange={setIsPackage}
            label={classes ? "Cena obejmuje kilka spotkań" : "To pakiet lekcji"}
          />
          <input type="hidden" name="is_package" value={isPackage ? "true" : "false"} />
        </label>

        {isPackage && (
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-300">
              {classes ? "Liczba spotkań" : "Liczba lekcji w pakiecie"}{" "}
              <span className="text-[var(--color-accent)]">*</span>
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
              <span className="text-sm text-zinc-500">{unit}</span>
            </span>
            {/* Nothing is computed from this: the name and the price are what
                the school actually charges, typed as they are on its price
                list. Dividing one by the other would invent a per-lesson rate
                nobody sells. */}
            {/* The owner sees the shape of what they are selling without
                having to hold two fields in their head. */}
            {/* For classes the length of a meeting is its hours, set per day
                below — a minutes figure here would be one nobody reads and
                bookings do not follow. */}
            <span className="mt-2 block text-xs text-zinc-500">
              Klient zobaczy:{" "}
              <span className="text-zinc-300">
                {classes ? count(lessons) : `${count(lessons)} × ${duration} min`}
              </span>
            </span>
            <span className="mt-1 block text-xs text-zinc-600">
              {classes
                ? "Cena poniżej dotyczy wszystkich spotkań razem. Daty wynikają z dni tygodnia niżej — zapis zajmuje kolejne tygodnie od wybranego dnia."
                : "Cena poniżej dotyczy całego pakietu. Terminy kolejnych lekcji ustalacie po drodze — nikt nie musi podawać wszystkich dat z góry."}
            </span>
            {state.status === "error" && state.fieldErrors?.total_lessons && (
              <span className="mt-1 block text-xs text-red-400">{state.fieldErrors.total_lessons}</span>
            )}
          </label>
        )}
      </div>

      <div className={`grid gap-4 ${classes ? "grid-cols-1" : "grid-cols-2"}`}>
        {classes ? (
          // Kept so saving does not change it; the meeting's real length is
          // the Od–Do of each day, which is what bookings are made from.
          <input type="hidden" name="duration_min" value={duration} />
        ) : (
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
        )}

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-300">
            {isPackage ? (classes ? "Cena za wszystkie spotkania (zł)" : "Cena pakietu (zł)") : "Cena (zł)"}{" "}
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
      {state.status === "ok" && (
        <p className="text-sm text-emerald-400">{state.message}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" radius="full" disabled={pending} className="px-5 py-2.5">
          {pending ? "Zapisuję…" : service ? "Zapisz zmiany" : "Dodaj usługę"}
        </Button>
        <ButtonLink href={`${adminBase}${backTo}`} variant="secondary" radius="full" className="px-5 py-2.5">
          {state.status === "ok" ? "Wróć" : "Anuluj"}
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
