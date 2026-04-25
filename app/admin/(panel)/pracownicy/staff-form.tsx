"use client";

import { useActionState, useState } from "react";
import type { Staff } from "@/lib/db/staff";
import type { Service } from "@/lib/types";
import type { StaffFormState } from "./actions";

const COLORS = [
  "#d4a26a","#6ab0d4","#6ad4a2","#d46a6a",
  "#a26ad4","#d4c26a","#6a8fd4","#d48f6a",
  "#c46ad4","#6ad4c4",
];

const inp =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";

export function StaffForm({
  action,
  staff,
  services,
  assignedServiceIds,
}: {
  action: (prev: StaffFormState, fd: FormData) => Promise<StaffFormState>;
  staff?: Staff;
  services: Service[];
  assignedServiceIds?: string[];
}) {
  const [state, formAction, pending] = useActionState<StaffFormState, FormData>(
    action,
    { status: "idle" }
  );

  const err = state.status === "error" ? state.fieldErrors ?? {} : {};
  const defaultColor = staff?.color ?? "#d4a26a";
  const [selectedColor, setSelectedColor] = useColorState(defaultColor);

  return (
    <form action={formAction} className="space-y-6">
      {staff && <input type="hidden" name="id" value={staff.id} />}

      {state.status === "ok" && (
        <p className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">
          Zapisano.
        </p>
      )}
      {state.status === "error" && !Object.keys(err).length && (
        <p className="rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <div className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Imię / nazwa *</label>
          <input name="name" defaultValue={staff?.name ?? ""} className={inp} />
          {err.name && <p className="mt-1 text-xs text-red-400">{err.name}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Bio (opcjonalne)</label>
          <textarea
            name="bio"
            defaultValue={staff?.bio ?? ""}
            rows={2}
            className={`${inp} resize-none`}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">Kolor w kalendarzu</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`h-8 w-8 rounded-full transition-transform ${
                  selectedColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110" : "hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <input type="hidden" name="color" value={selectedColor} />
          {err.color && <p className="mt-1 text-xs text-red-400">{err.color}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Kolejność</label>
          <input
            type="number"
            name="sort_order"
            defaultValue={staff?.sort_order ?? 0}
            min={0}
            className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
      </div>

      {services.length > 0 && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <p className="mb-3 text-sm text-zinc-400">Przypisane usługi</p>
          <div className="space-y-2">
            {services.map((s) => {
              const checked = assignedServiceIds?.includes(s.id) ?? false;
              return (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="serviceIds[]"
                    value={s.id}
                    defaultChecked={checked}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-[var(--color-accent)]"
                  />
                  <span className="text-sm text-zinc-300">{s.name}</span>
                  <span className="text-xs text-zinc-600">{s.duration_min} min</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <a
          href="/admin/pracownicy"
          className="rounded-full border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
        >
          Anuluj
        </a>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {pending ? "Zapisuję…" : "Zapisz"}
        </button>
      </div>
    </form>
  );
}

function useColorState(initial: string): [string, (c: string) => void] {
  return useState(initial);
}
