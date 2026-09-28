import Link from "next/link";
import type { ClassGroupWithService } from "@/lib/db/class-groups";
import { WEEKDAY_NAMES, WEEK_ORDER, meetingTimeLabel } from "@/lib/class-groups";
import { meetingsLabel } from "@/lib/service-label";

/**
 * The courses on offer, each with the days it runs on.
 *
 * Shown instead of a grid of weekly slots. A parent is choosing a class for a
 * child of a given age — "mam ośmiolatka, która grupa?" — and a week grid
 * makes them scan eight tiles to discover there are three courses. The
 * studio's own site is organised this way too.
 */
export function CourseList({
  groups,
  hrefFor,
}: {
  groups: ClassGroupWithService[];
  hrefFor: (serviceSlug: string) => string;
}) {
  const byService = new Map<string, ClassGroupWithService[]>();
  for (const g of groups) {
    const list = byService.get(g.service_id) ?? [];
    list.push(g);
    byService.set(g.service_id, list);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[...byService.values()].map((slots) => {
        const service = slots[0].service;
        const lessons = service.total_lessons ?? 0;
        const days = [...slots].sort(
          (a, b) =>
            WEEK_ORDER.indexOf(a.day_of_week as never) -
            WEEK_ORDER.indexOf(b.day_of_week as never)
        );
        return (
          <Link
            key={service.id}
            href={hrefFor(service.slug)}
            className="group flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4 transition-all hover:border-[var(--color-accent)]/40 hover:bg-zinc-900/70 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 font-medium text-zinc-100">{service.name}</p>
              <span
                className="shrink-0 font-mono text-sm font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                {lessons > 1 ? `${service.price_pln} zł` : "—"}
              </span>
            </div>

            {lessons > 1 && (
              <p className="mt-0.5 text-right text-[11px] text-zinc-500">
                miesiąc · {meetingsLabel(lessons)}
              </p>
            )}

            <ul className="mt-3 space-y-0.5">
              {days.map((g) => (
                <li key={g.id} className="flex items-baseline gap-2 text-xs text-zinc-400">
                  <span className="w-24 shrink-0">{WEEKDAY_NAMES[g.day_of_week]}</span>
                  <span className="font-mono text-zinc-300">{meetingTimeLabel(g)}</span>
                </li>
              ))}
            </ul>

            {service.enroll_mode === "enquiry" && (
              <p className="mt-3 text-[11px] text-zinc-500">Zapisy po rozmowie.</p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
