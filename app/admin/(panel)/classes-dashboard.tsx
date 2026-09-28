import { AdminLink } from "@/components/admin-link";
import { StatTile } from "@/components/ui/stat-tile";
import { card, sectionHeading as heading } from "@/components/ui/surface";
import type { ClassesOverview } from "@/lib/db/classes-overview";
import { WEEKDAY_NAMES } from "@/lib/class-groups";

function shortDate(day: string) {
  return new Date(day + "T12:00:00Z").toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
  });
}

/**
 * The top of the dashboard for a studio that teaches groups.
 *
 * The booking tiles it replaces answer a salon's question — how busy is the
 * chair. A pracownia asks three others: who is coming today, which groups
 * have not gathered yet, and whose month is about to run out. The last list
 * exists because a month is four meetings and nothing renews itself; without
 * it a child stops appearing and nobody notices until the room is half empty.
 */
export function ClassesDashboard({
  overview,
  classesLabel,
  base,
}: {
  overview: ClassesOverview;
  classesLabel: string;
  /** "/admin" or "/demo/{slug}" — links must stay inside the demo. */
  base: string;
}) {
  const { today, filling, runningOut, childrenCount, date } = overview;
  const todayTotal = today.reduce((n, c) => n + c.taken, 0);

  return (
    <>
      {/* No revenue tile: a studio is paid for a month up front, so "this
          month's revenue" counts the months that happened to start in it —
          a number that answers nothing they ask. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label={`${classesLabel} dziś`}
          value={String(today.length)}
          sub={today.length > 0 ? `${todayTotal} dzieci` : "dziś wolne"}
          href={`${base}/harmonogram`}
        />
        <StatTile
          label="Dzieci zapisanych"
          value={String(childrenCount)}
          sub="przejdź do listy"
          href={`${base}/klienci`}
        />
        <StatTile
          label="Grupy do skompletowania"
          value={String(filling.length)}
          sub={filling.length > 0 ? "brakuje osób" : "wszystkie zebrane"}
          href={`${base}/zajecia`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${card} p-5`}>
          <h2 className={heading}>Dziś w pracowni</h2>
          {today.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Dziś nie ma zajęć.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {today.map((c) => (
                <li key={c.groupId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm text-zinc-200">{c.time}</span>
                  <span className="text-sm text-zinc-300">{c.name}</span>
                  <span className="text-xs text-zinc-500">
                    {c.min ? `${c.taken} z ${c.min}` : `${c.taken} dzieci`}
                  </span>
                  {c.names.length > 0 && (
                    <span className="w-full text-xs text-zinc-600">{c.names.join(", ")}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} p-5`}>
          <h2 className={heading}>Zbierają się</h2>
          {filling.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              Wszystkie grupy mają komplet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {filling.slice(0, 6).map((g) => (
                <li key={g.groupId} className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-sm text-zinc-300">
                    {WEEKDAY_NAMES[g.dayOfWeek]}
                  </span>
                  <span className="font-mono text-xs text-zinc-400">{g.time}</span>
                  <span className="text-xs text-zinc-500">{g.name}</span>
                  <span className="ml-auto text-xs text-[var(--color-accent)]">
                    brakuje {g.min - g.taken}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {runningOut.length > 0 && (
        <section className={`${card} p-5`}>
          <h2 className={heading}>Kończy się miesiąc</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Ostatnie opłacone spotkanie w ciągu dwóch tygodni albo już za nami.
            Zapis nie przedłuża się sam — trzeba dopisać kolejny miesiąc.
          </p>
          <ul className="mt-3 space-y-2">
            {runningOut.slice(0, 8).map((r) => (
              <li
                key={r.customerId + r.lastDate}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
              >
                <AdminLink
                  href={`/admin/klienci/${r.customerId}`}
                  className="text-sm text-zinc-200 hover:text-zinc-50"
                >
                  {r.childName}
                </AdminLink>
                <span className="text-xs text-zinc-500">{r.courseName}</span>
                {/* Already over is the more urgent of the two: the child has
                    stopped appearing and nobody signed them up again. */}
                <span
                  className={`ml-auto font-mono text-xs ${
                    r.lastDate < date ? "text-[var(--color-accent)]" : "text-zinc-400"
                  }`}
                >
                  {r.lastDate < date ? "skończył się " : "do "}
                  {shortDate(r.lastDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
