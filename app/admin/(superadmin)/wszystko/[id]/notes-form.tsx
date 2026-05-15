"use client";

import { useActionState } from "react";
import { saveTenantNotesAction, type NotesState } from "./actions";

export function TenantNotesForm({
  tenantId,
  initialNotes,
}: {
  tenantId: string;
  initialNotes: string;
}) {
  const [state, action, pending] = useActionState<NotesState, FormData>(
    saveTenantNotesAction,
    {}
  );

  return (
    <form action={action}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <textarea
        name="notes"
        defaultValue={initialNotes}
        rows={4}
        placeholder="Wpisz notatki o tym kliencie…"
        className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-800 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "Zapisuję…" : "Zapisz notatki"}
        </button>
        {state.saved && <span className="text-xs text-emerald-400">Zapisano</span>}
        {state.error && <span className="text-xs text-red-400">{state.error}</span>}
      </div>
    </form>
  );
}
