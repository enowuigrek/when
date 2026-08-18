import { formatWarsawTime } from "@/lib/slots";
import type { BookingWithService } from "@/lib/db/bookings";

/**
 * At-a-glance figures for whatever range the schedule is showing.
 *
 * The panel root redirects here, so this page is where the day starts — and
 * since the dashboard went away it was the one place carrying no summary at
 * all. Lives in the right rail under the calendar, which is also what fills
 * the dead space that column used to leave.
 *
 * The count leads and money follows: the count is what you scan a day for.
 */
export function DaySummary({
  bookings,
  view,
  now,
}: {
  bookings: BookingWithService[];
  view: "dzien" | "tydzien";
  now: string;
}) {
  const count = bookings.length;
  const revenue = bookings.reduce(
    (sum, b) => sum + (b.price_pln_snapshot ?? b.service?.price_pln ?? 0),
    0
  );
  const upcoming = bookings
    .filter((b) => b.starts_at > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  const rangeLabel = view === "dzien" ? "dziś" : "w tym tygodniu";

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Rezerwacje {rangeLabel}</p>
        <p className="font-mono text-2xl font-semibold text-zinc-100">{count}</p>
      </div>

      {count > 0 && (
        <p className="mt-1 text-right font-mono text-xs text-zinc-500">{revenue} zł</p>
      )}

      <div className="mt-4 border-t border-zinc-800/60 pt-3">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Najbliższa</p>
        {upcoming ? (
          <div className="mt-1.5">
            <p className="font-mono text-sm text-[var(--color-accent)]">
              {formatWarsawTime(upcoming.starts_at)}
            </p>
            <p className="mt-0.5 truncate text-sm text-zinc-200">{upcoming.customer_name}</p>
            <p className="truncate text-xs text-zinc-500">
              {upcoming.service?.name ?? "—"}
              {upcoming.staff?.name ? ` · ${upcoming.staff.name}` : ""}
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-zinc-600">
            {count > 0 ? "Na dziś już nic" : "Brak rezerwacji"}
          </p>
        )}
      </div>
    </div>
  );
}
