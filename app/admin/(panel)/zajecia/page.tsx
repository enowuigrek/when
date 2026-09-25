import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { getAdminTenantId, getAdminTenantFeatures } from "@/lib/tenant";
import { hasFeature } from "@/lib/features";
import {
  getClassGroupsForTenant,
  getSeatCountsForTenant,
  getGroupRosterForTenant,
  seatsKey,
} from "@/lib/db/class-groups";
import {
  WEEKDAY_NAMES,
  WEEK_ORDER,
  meetingTimeLabel,
  nextMeetings,
} from "@/lib/class-groups";
import { formatWarsawDate } from "@/lib/slots";
import { AddToGroupDialog } from "./add-to-group-dialog";

export const metadata = { title: "Zajęcia", robots: { index: false } };

/** How many meetings ahead the page shows for each group. */
const HORIZON = 4;

/**
 * The timetable as the owner needs to read it: what runs, when, and who is in
 * it — including the groups nobody has signed up for yet.
 *
 * The schedule cannot answer that on its own. It draws bookings, so an empty
 * group is an empty Monday afternoon there, indistinguishable from a free one
 * — which is exactly how you end up putting a haircut on top of a class.
 */
export default async function ZajeciaPage() {
  const tenantId = await getAdminTenantId();
  const features = await getAdminTenantFeatures();
  if (!hasFeature(features, "grupy")) notFound();

  const groups = await getClassGroupsForTenant(tenantId, { includeInactive: true });
  if (groups.length === 0) {
    return (
      <PageShell title="Zajęcia" narrow>
        <p className="mt-6 text-sm text-zinc-500">
          Nie ma jeszcze żadnych grup.
        </p>
      </PageShell>
    );
  }

  const meetingsByGroup = new Map(
    groups.map((g) => [g.id, nextMeetings(g, HORIZON)] as const)
  );
  const allInstants = [...meetingsByGroup.values()].flat();
  const from = allInstants.reduce(
    (a, m) => (a < m.startsAtIso ? a : m.startsAtIso),
    allInstants[0].startsAtIso
  );
  const to = allInstants.reduce(
    (a, m) => (a > m.endsAtIso ? a : m.endsAtIso),
    allInstants[0].endsAtIso
  );

  const ids = groups.map((g) => g.id);
  const [seats, roster] = await Promise.all([
    getSeatCountsForTenant(ids, from, to, tenantId),
    getGroupRosterForTenant(ids, from, to, tenantId),
  ]);

  const byDay = new Map<number, typeof groups>();
  for (const g of groups) {
    const list = byDay.get(g.day_of_week) ?? [];
    list.push(g);
    byDay.set(g.day_of_week, list);
  }
  const days = WEEK_ORDER.filter((d) => (byDay.get(d)?.length ?? 0) > 0);

  return (
    <PageShell
      title="Zajęcia"
      subtitle="Stałe grupy w tygodniu. Dopisujesz tu dziecko od razu na cały karnet."
    >
      <div className="mt-8 space-y-10">
        {days.map((dow) => (
          <section key={dow}>
            <h2 className="mb-3 border-b border-zinc-800/60 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {WEEKDAY_NAMES[dow]}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {(byDay.get(dow) ?? []).map((g) => {
                const meetings = meetingsByGroup.get(g.id)!;
                const names = roster.get(seatsKey(g.id, meetings[0].date)) ?? [];
                const taken = seats.get(seatsKey(g.id, meetings[0].date)) ?? 0;
                return (
                  <div
                    key={g.id}
                    className={`rounded-xl border p-4 ${
                      g.active
                        ? "border-zinc-800/60 bg-zinc-900/30"
                        : "border-zinc-800/40 bg-zinc-900/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-zinc-100">
                          {meetingTimeLabel(g)}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-300">
                          {g.age_label ?? g.service.name}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">{g.service.name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm text-zinc-300">
                          {g.service.total_lessons
                            ? `${g.service.price_pln} zł / ${g.service.total_lessons} spotkania`
                            : "cena do ustalenia"}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {g.max_participants != null
                            ? `${taken} z ${g.max_participants} miejsc`
                            : g.min_participants != null && taken < g.min_participants
                              ? `zapisanych ${taken} z ${g.min_participants} — grupa się zbiera`
                              : `zapisanych ${taken}`}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-zinc-500">
                      Najbliżej: {formatWarsawDate(meetings[0].startsAtIso)}
                      {names.length > 0 && <> · {names.join(", ")}</>}
                    </p>

                    {!g.active ? (
                      <p className="mt-3 text-xs text-zinc-600">
                        Grupa nieaktywna — nie pokazuje się w zapisach.
                      </p>
                    ) : (
                      <AddToGroupDialog
                        groupId={g.id}
                        label={`${WEEKDAY_NAMES[dow]} ${meetingTimeLabel(g)} — ${
                          g.age_label ?? g.service.name
                        }`}
                        karnet={
                          g.service.total_lessons && g.service.total_lessons > 1
                            ? { lessons: g.service.total_lessons, pricePln: g.service.price_pln }
                            : null
                        }
                        dates={meetings.map((m) => formatWarsawDate(m.startsAtIso))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
