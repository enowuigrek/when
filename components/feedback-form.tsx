"use client";

import { useActionState, useState } from "react";
import { submitFeedbackAction, type FeedbackState } from "@/app/admin/(panel)/ustawienia/feedback-actions";

const CATEGORIES = [
  { value: "general", label: "Ogólne" },
  { value: "bug", label: "Zgłoszenie błędu" },
  { value: "feature", label: "Pomysł / sugestia" },
  { value: "question", label: "Pytanie" },
];

export function FeedbackForm() {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(
    submitFeedbackAction,
    {}
  );
  const [sent, setSent] = useState(false);

  if (state.success && !sent) setSent(true);

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5 text-center">
        <p className="text-sm text-emerald-400">Dziękujemy za opinię! Odpowiemy najszybciej jak to możliwe.</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Wyślij kolejną
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs text-zinc-400">Kategoria</label>
        <select
          name="category"
          defaultValue="general"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-zinc-400">Twoja wiadomość</label>
        <textarea
          name="message"
          required
          rows={4}
          placeholder="Opisz problem, sugestię lub pytanie…"
          className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Wysyłam…" : "Wyślij opinię"}
      </button>
    </form>
  );
}
