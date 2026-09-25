import Link from "next/link";
import type { ClassGroupWithService } from "@/lib/db/class-groups";
import {
  WEEKDAY_NAMES,
  WEEK_ORDER,
  meetingTimeLabel,
  nextMeetingDates,
} from "@/lib/class-groups";
import { seatsKey } from "@/lib/db/class-groups";

/**
 * The week the way the studio prints it on its own wall: one column per day,
 * the classes stacked inside it.
 *
 * A month calendar is the wrong shape for this. Nothing here depends on which
 * Monday it is — the question a parent is answering is "which day and which
 * age group", and the date only becomes interesting once they have chosen.
 */
export function ClassWeekGrid({
  groups,
  seats,
  hrefFor,
}: {
  groups: ClassGroupWithService[];
  /** `groupId|YYYY-MM-DD` → how many are already down for that meeting. */
  seats: Map<string, number>;
  hrefFor: (group: ClassGroupWithService) => string;
}) {
  const byDay = new Map<number, ClassGroupWithService[]>();
  for (const g of groups) {
    const list = byDay.get(g.day_of_week) ?? [];
    list.push(g);
    byDay.set(g.day_of_week, list);
  }

  // Days nobody runs anything on are dropped rather than shown empty: six
  // columns of real classes read better than seven with a hole in the middle.
  const days = WEEK_ORDER.filter((d) => (byDay.get(d)?.length ?? 0) > 0);

  return (
    // auto-fit, not a fixed column count: four open days should sit in one row
    // rather than three and a lonely Friday underneath. items-start stops a day
    // with one class from being stretched to the height of a day with three,
    // which read as a box someone had forgotten to fill.
    <div
      className="grid items-start gap-x-6 gap-y-8"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
    >
      {days.map((dow) => (
        <div key={dow}>
          <p className="mb-3 border-b border-zinc-800/60 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {WEEKDAY_NAMES[dow]}
          </p>
          <div className="space-y-2">
            {(byDay.get(dow) ?? []).map((g) => (
              <ClassTile key={g.id} group={g} seats={seats} href={hrefFor(g)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClassTile({
  group,
  seats,
  href,
}: {
  group: ClassGroupWithService;
  seats: Map<string, number>;
  href: string;
}) {
  const [nextDate] = nextMeetingDates(group.day_of_week, 1);
  const taken = seats.get(seatsKey(group.id, nextDate)) ?? 0;
  const full =
    group.max_participants != null && taken >= group.max_participants;

  const tile =
    "block rounded-lg border px-3 py-3 transition-colors " +
    (full
      ? "cursor-not-allowed border-zinc-800/40 bg-zinc-900/20"
      : "border-zinc-800 bg-zinc-900/40 hover:border-[var(--color-accent)]/50 hover:bg-zinc-900/70");

  const body = (
    <>
      <p className="font-mono text-sm font-semibold text-zinc-100">
        {meetingTimeLabel(group)}
      </p>
      <p className="mt-0.5 text-sm text-zinc-300">
        {group.age_label ?? group.service.name}
      </p>
      <p className="mt-1.5 text-xs">
        <Seats group={group} taken={taken} />
      </p>
    </>
  );

  if (full) {
    return (
      <div className={tile} aria-disabled>
        {body}
      </div>
    );
  }
  return (
    <Link href={href} className={tile}>
      {body}
    </Link>
  );
}

/**
 * What the count means, rather than the count.
 *
 * "Zapisanych: 2" tells a parent nothing — two out of what? Below the minimum
 * the honest line is that the group is still forming, which is also the line
 * that makes signing up feel useful rather than risky.
 */
function Seats({
  group,
  taken,
}: {
  group: ClassGroupWithService;
  taken: number;
}) {
  const min = group.min_participants;
  const max = group.max_participants;

  if (max != null && taken >= max) {
    return <span className="text-zinc-500">Brak miejsc</span>;
  }
  if (min != null && taken < min) {
    return (
      <span className="text-zinc-500">
        Zbieramy grupę — zapisanych {taken} z {min}
      </span>
    );
  }
  if (max != null) {
    return (
      <span className="text-zinc-400">
        Wolne miejsca: {max - taken} z {max}
      </span>
    );
  }
  return <span className="text-zinc-400">Zapisanych: {taken}</span>;
}
