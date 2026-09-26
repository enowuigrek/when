"use client";

import { useActionState, useState } from "react";
import { enrollAction, type EnrollState } from "./actions";

const input =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-[var(--color-accent)]";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-600">{hint}</span>}
    </label>
  );
}

export function EnrollForm({
  tenantSlug,
  groupSlug,
  karnet,
  trialLabel,
  words,
}: {
  tenantSlug: string;
  groupSlug: string;
  /** Null when the course is not sold as a month — then there is only a trial. */
  karnet: { lessons: number; pricePln: number } | null;
  trialLabel: string;
  /** What this service calls the people it teaches. See lib/vocabulary.ts. */
  words: { enrollee: string; guardian: string | null; action: string };
}) {
  const [state, formAction, pending] = useActionState<EnrollState, FormData>(
    enrollAction,
    { status: "idle" }
  );
  const [mode, setMode] = useState<"karnet" | "probne">(karnet ? "karnet" : "probne");

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="groupSlug" value={groupSlug} />
      <input type="hidden" name="mode" value={mode} />

      {karnet && (
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeCard
            active={mode === "karnet"}
            onClick={() => setMode("karnet")}
            title={`Karnet — ${karnet.lessons} spotkania`}
            detail={`${karnet.pricePln} zł za miesiąc`}
          />
          <ModeCard
            active={mode === "probne"}
            onClick={() => setMode("probne")}
            title="Zajęcia próbne"
            detail={trialLabel}
          />
        </div>
      )}

      <Field label={`${words.enrollee} *`}>
        <input name="childName" required maxLength={120} placeholder="Zosia Kowalska" className={input} />
      </Field>

      {words.guardian && (
        <Field
          label={`${words.guardian} *`}
          hint="Telefon i e-mail zapisujemy przy opiekunie — po nich rozpoznajemy rodzeństwo."
        >
          <input name="guardianName" required maxLength={120} placeholder="Anna Kowalska" className={input} />
        </Field>
      )}

      <Field label="Telefon *">
        <input name="phone" type="tel" required maxLength={30} placeholder="+48 600 000 000" className={input} />
      </Field>

      <Field label="Email">
        <input
          name="email"
          type="email"
          maxLength={160}
          placeholder="opcjonalnie — do potwierdzenia"
          className={input}
        />
      </Field>

      <Field label="Uwagi">
        <textarea
          name="notes"
          rows={2}
          maxLength={1000}
          placeholder="Alergie, wcześniejsze doświadczenie, cokolwiek warto wiedzieć…"
          className={input}
        />
      </Field>

      {state.status === "error" && state.message && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-[var(--color-accent-fg)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
      >
        {pending
          ? "Zapisuję…"
          : mode === "karnet" && karnet
            ? `Zapisz na zajęcia — ${karnet.pricePln} zł`
            : "Zapisz na zajęcia próbne"}
      </button>
      <p className="text-center text-xs text-zinc-600">
        Zapis nie wymaga płatności online — rozliczacie się na miejscu.
      </p>
    </form>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  detail,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
          : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-600"
      }`}
    >
      <span className="block text-sm font-medium text-zinc-100">{title}</span>
      <span className="mt-0.5 block text-xs text-zinc-400">{detail}</span>
    </button>
  );
}
