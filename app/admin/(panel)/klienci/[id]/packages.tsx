import type { PackageProgress } from "@/lib/db/packages";
import { card, sectionHeading } from "@/components/ui/surface";

/**
 * How far through a bought package the customer is.
 *
 * The bar is the point: a school selling five lessons for one price needs to
 * see at a glance how many are in the diary and how many still need a phone
 * call. The numbers under it come from the package's own bookings, split by
 * date and status, so nothing here can drift from the calendar.
 */
export function CustomerPackages({ packages }: { packages: PackageProgress[] }) {
  if (packages.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className={`mb-3 ${sectionHeading}`}>Pakiety</h2>
      <ul className="space-y-2">
        {packages.map((p) => {
          const usedUp = p.done + p.scheduled;
          const pct = Math.min(100, Math.round((usedUp / p.totalLessons) * 100));
          return (
            <li key={p.id} className={`${card} p-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-zinc-200">{p.serviceName}</p>
                <p className="font-mono text-sm text-zinc-400">
                  <span className="text-zinc-100">{usedUp}</span>/{p.totalLessons} lekcji
                </p>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-zinc-500">
                {p.done > 0 && <>{p.done} odbyte · </>}
                {p.scheduled} umówione ·{" "}
                <span className={p.toSchedule > 0 ? "text-zinc-300" : undefined}>
                  {p.toSchedule} do ustalenia
                </span>
                {p.cancelled > 0 && <> · {p.cancelled} anulowane</>}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
