import type { BusinessHours } from "@/lib/types";
import { dayLabels } from "@/lib/business";

function formatTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5); // "10:00:00" → "10:00"
}

export function HoursTable({ hours }: { hours: BusinessHours[] }) {
  // Reorder so Monday is first (UX: Polish convention).
  const ordered = [...hours].sort((a, b) => {
    const remap = (d: number) => (d === 0 ? 7 : d);
    return remap(a.day_of_week) - remap(b.day_of_week);
  });

  const today = new Date().getDay();

  return (
    <ul className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
      {ordered.map((h) => {
        const isToday = h.day_of_week === today;
        return (
          <li
            key={h.day_of_week}
            className={`flex items-center justify-between px-5 py-3 ${
              isToday ? "bg-zinc-900/80" : ""
            }`}
          >
            <span
              className={`font-medium ${
                isToday ? "text-[var(--color-accent)]" : "text-zinc-200"
              }`}
            >
              {dayLabels[h.day_of_week]}
              {isToday && <span className="ml-2 text-xs text-zinc-500">dziś</span>}
            </span>
            <span className="font-mono text-sm text-zinc-400">
              {h.closed
                ? "zamknięte"
                : `${formatTime(h.open_time)} – ${formatTime(h.close_time)}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
