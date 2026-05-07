import Link from "next/link";

export type StaffFilterChip = {
  /** "all" for the "Wszyscy" chip, staff id otherwise. */
  id: string;
  label: string;
  /** Color dot — omit for the "Wszyscy" chip. */
  color?: string;
  /** Optional count badge (e.g. number of bookings / staff members). */
  count?: number;
  active: boolean;
  /** URL the user navigates to when clicking the chip. */
  href: string;
};

type Props = {
  chips: StaffFilterChip[];
  className?: string;
};

/**
 * Shared staff-filter strip used by both the harmonogram (single-select) and
 * the grafik (multi-select). Each chip is a Link with a precomputed href, so
 * the parent owns selection semantics — the component is purely visual.
 */
export function StaffFilterBar({ chips, className = "" }: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {chips.map((c) => (
        <Link
          key={c.id}
          href={c.href}
          aria-pressed={c.active}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition-colors ${
            c.active
              ? "border-zinc-700 bg-zinc-800 text-zinc-100"
              : "border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          }`}
        >
          {c.color && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: c.color }}
            />
          )}
          <span>{c.label}</span>
          {typeof c.count === "number" && (
            <span className="font-mono text-zinc-500">{c.count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
