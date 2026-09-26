"use client";

import { useActionState, useState } from "react";
import { addToGroupAction, type AddToGroupState } from "./actions";

const input =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-[var(--color-accent)]";

/** The words this service uses for the people it teaches. See lib/vocabulary.ts. */
export type EnrollWords = {
  enrollee: string;
  guardian: string | null;
  action: string;
};

export type GroupEnrollProps = {
  groupId: string;
  /** Which class this is — day, hour, age group. */
  label: string;
  karnet: { lessons: number; pricePln: number } | null;
  /** The dates a karnet sign-up would take, already formatted. */
  dates: string[];
  words: EnrollWords;
};

/**
 * Adding somebody to a group.
 *
 * Used from the classes page and from the block in the schedule, because the
 * act is the same in both places and two copies of it would drift.
 */
export function GroupEnrollForm({
  groupId,
  label,
  karnet,
  dates,
  words,
  onAgain,
  onClose,
}: GroupEnrollProps & { onAgain: () => void; onClose: () => void }) {
  const [mode, setMode] = useState<"karnet" | "probne">(karnet ? "karnet" : "probne");
  const [state, formAction, pending] = useActionState<AddToGroupState, FormData>(
    addToGroupAction,
    { status: "idle" }
  );

  if (state.status === "ok") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-400">{state.message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAgain}
            className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            {words.action}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Zamknij
          </button>
        </div>
      </div>
    );
  }

  const shown = mode === "karnet" ? dates : dates.slice(0, 1);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="mode" value={mode} />
      <p className="text-xs text-zinc-500">{label}</p>

      {karnet && (
        <div className="flex flex-wrap gap-2">
          {(["karnet", "probne"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                mode === m
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-zinc-100"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {/* Not "4 × 220 zł" — that reads as 880. The karnet is one price
                  for the month. */}
              {m === "karnet"
                ? `Karnet — ${karnet.lessons} spotkania, ${karnet.pricePln} zł`
                : "Jedno spotkanie"}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Zapisze na: <span className="text-zinc-300">{shown.join(", ")}</span>
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="childName"
          required
          maxLength={120}
          placeholder={`${words.enrollee} *`}
          className={input}
        />
        <input name="phone" type="tel" required maxLength={30} placeholder="Telefon *" className={input} />
        {words.guardian && (
          <input name="guardianName" required maxLength={120} placeholder={`${words.guardian} *`} className={input} />
        )}
        <input name="email" type="email" maxLength={160} placeholder="Email" className={input} />
      </div>
      <input name="notes" maxLength={1000} placeholder="Uwagi" className={input} />

      {words.guardian && (
        <p className="text-[11px] text-zinc-600">
          Telefon i e-mail należą do opiekuna — po nich rozpoznajemy rodzeństwo
          zapisane na różne zajęcia.
        </p>
      )}

      {state.status === "error" && state.message && (
        <p className="text-xs text-red-400">{state.message}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold text-[var(--color-accent-fg)] disabled:opacity-60"
        >
          {pending ? "Zapisuję…" : "Zapisz"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Anuluj
        </button>
      </div>
    </form>
  );
}
