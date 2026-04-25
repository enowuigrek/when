"use client";

import { useActionState } from "react";
import type { TimeFilter } from "@/lib/db/settings";
import {
  createFilterAction,
  toggleFilterActiveAction,
  deleteFilterAction,
  type FilterFormState,
} from "./actions";

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export function FiltersSection({ filters }: { filters: TimeFilter[] }) {
  const [state, action, pending] = useActionState<FilterFormState, FormData>(
    createFilterAction,
    { status: "idle" }
  );
  const err = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <div className="space-y-6">
      {/* Existing filters */}
      <div className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
        {filters.length === 0 && (
          <p className="px-5 py-4 text-sm text-zinc-500">Brak filtrów.</p>
        )}
        {filters.map((f) => (
          <div
            key={f.id}
            className={`flex items-center justify-between gap-4 px-5 py-3 ${f.active ? "" : "opacity-50"}`}
          >
            <div>
              <span className="font-medium text-zinc-100">{f.label}</span>
              <span className="ml-3 font-mono text-sm text-zinc-500">
                {f.from_hour}:00 – {f.to_hour}:00
              </span>
            </div>
            <div className="flex items-center gap-2">
              <form action={toggleFilterActiveAction}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="active" value={String(f.active)} />
                <button
                  type="submit"
                  className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 transition-colors"
                >
                  {f.active ? "Ukryj" : "Aktywuj"}
                </button>
              </form>
              <form action={deleteFilterAction}>
                <input type="hidden" name="id" value={f.id} />
                <button
                  type="submit"
                  className="rounded px-2 py-1 text-xs text-red-500 hover:text-red-300 border border-red-900/60 hover:border-red-700/60 transition-colors"
                  onClick={(e) => {
                    if (!confirm(`Usuń filtr "${f.label}"?`)) e.preventDefault();
                  }}
                >
                  Usuń
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {/* Add new filter */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-300">Dodaj filtr</h3>

        {state.status === "error" && !Object.keys(err).length && (
          <p className="mb-3 text-sm text-red-400">{state.message}</p>
        )}
        {state.status === "ok" && (
          <p className="mb-3 text-sm text-emerald-400">Dodano.</p>
        )}

        <form action={action} className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs text-zinc-500">Nazwa</label>
            <input
              name="label"
              placeholder="np. Rano"
              className={input}
            />
            {err.label && <p className="text-xs text-red-400">{err.label}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-zinc-500">Od (godz)</label>
            <select name="from_hour" defaultValue={8} className={input}>
              {HOURS.slice(0, 24).map((h) => (
                <option key={h} value={h}>{h}:00</option>
              ))}
            </select>
            {err.from_hour && <p className="text-xs text-red-400">{err.from_hour}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-zinc-500">Do (godz)</label>
            <select name="to_hour" defaultValue={12} className={input}>
              {HOURS.slice(1).map((h) => (
                <option key={h} value={h}>{h}:00</option>
              ))}
            </select>
            {err.to_hour && <p className="text-xs text-red-400">{err.to_hour}</p>}
          </div>

          <input type="hidden" name="sort_order" value={filters.length} />

          <div className="sm:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-600 disabled:opacity-50"
            >
              {pending ? "Dodaję…" : "+ Dodaj filtr"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const input =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";
