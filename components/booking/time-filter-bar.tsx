"use client";

import type { TimeFilter } from "@/lib/db/settings";

type Props = {
  filters: TimeFilter[];
  activeId: string | null;
  onToggle: (id: string) => void;
};

/**
 * Shared time-filter pill bar (e.g. "Rano / Popołudnie / Wieczór").
 * Toggles the active filter on/off when the same id is clicked again.
 */
export function TimeFilterBar({ filters, activeId, onToggle }: Props) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onToggle(f.id)}
          className={`rounded-full border px-3 py-0.5 text-xs transition-colors ${
            activeId === f.id
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Filter slots by an active TimeFilter id. Returns the original list when no filter is active.
 * Both flows used identical logic — extracted here to avoid drift.
 */
export function applyTimeFilter<T extends { label: string }>(
  slots: T[],
  activeId: string | null,
  filters: TimeFilter[]
): T[] {
  if (!activeId) return slots;
  const f = filters.find((x) => x.id === activeId);
  if (!f) return slots;
  return slots.filter((s) => {
    const h = Number(s.label.split(":")[0]);
    return h >= f.from_hour && h < f.to_hour;
  });
}
