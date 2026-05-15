"use client";

import { useActionState, useState } from "react";
import { createTenantAction, type NewTenantState } from "./actions";

export function NewTenantForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<NewTenantState, FormData>(
    createTenantAction,
    {}
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        + Dodaj klienta
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Nowy klient</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-zinc-500 hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">Nazwa firmy</label>
            <input
              name="name"
              required
              placeholder="np. Salon Piękności Ania"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">Slug (URL)</label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-zinc-600">when.pl/</span>
              <input
                name="slug"
                required
                placeholder="salon-ania"
                pattern="[a-z0-9\-]+"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">Email logowania</label>
            <input
              name="email"
              type="email"
              required
              placeholder="ania@salon.pl"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">Hasło tymczasowe</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="min. 8 znaków"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>

          {state.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {pending ? "Tworzę…" : "Utwórz konto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
