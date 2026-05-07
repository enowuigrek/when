"use client";

import type { Slot } from "@/lib/slots";

type Props = {
  slots: Slot[];
  selectedIso: string | null;
  onPick: (slot: Slot) => void;
  loading?: boolean;
  /** When true, show "no slots in filter" message instead of "no slots that day". */
  filtered?: boolean;
};

/**
 * Shared time-slot grid. Slots with `available: false` are rendered disabled with a strikethrough.
 * Used by both admin booking and the widget flow so styling stays in lockstep.
 */
export function TimeSlotGrid({ slots, selectedIso, onPick, loading = false, filtered = false }: Props) {
  if (loading) {
    return <p className="text-sm text-zinc-500">Ładowanie…</p>;
  }
  if (slots.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        {filtered
          ? "Brak terminów w tym przedziale — spróbuj inny filtr."
          : "Brak wolnych terminów tego dnia."}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
      {slots.map((s) => {
        const isSelected = s.startsAtIso === selectedIso;
        const isTaken = s.available === false;
        return (
          <button
            key={s.startsAtIso}
            type="button"
            disabled={isTaken}
            onClick={() => !isTaken && onPick(s)}
            className={`rounded-md border py-2 font-mono text-sm transition-colors ${
              isTaken
                ? "cursor-not-allowed border-zinc-800/30 text-zinc-700 line-through"
                : isSelected
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-semibold"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900"
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
