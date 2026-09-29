import { AdminLink } from "@/components/admin-link";
import { lessonsLabel, meetingsLabel } from "@/lib/service-label";
import { PageShell } from "@/components/ui/page-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId, getAdminTenantFeatures } from "@/lib/tenant";
import { hasFeature } from "@/lib/features";
import { getClassGroupsForTenant } from "@/lib/db/class-groups";
import { WEEK_ORDER, WEEKDAY_SHORT } from "@/lib/weekdays";
import { toggleServiceActiveAction } from "./actions";
import { DeleteServiceButton } from "./delete-service-button";
import { Button, buttonClasses } from "@/components/ui/button";
import { AddAction } from "@/components/ui/add-action";
import type { Service } from "@/lib/types";

export const metadata = { title: "Usługi", robots: { index: false } };

async function getAllServices(): Promise<Service[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order")
    .order("name");
  return (data ?? []) as Service[];
}

/**
 * For each service that meets on fixed days, which days — "pn, wt, czw, pt".
 *
 * A class is made on its edit page now, and the list that leads there spoke
 * of "pakiet · 4 lekcje" and "90 min / lekcja" for the very same course.
 */
async function getClassDays(): Promise<Map<string, string>> {
  const tenantId = await getAdminTenantId();
  if (!hasFeature(await getAdminTenantFeatures(), "grupy")) return new Map();
  const byService = new Map<string, Set<number>>();
  // Inactive groups count here. Suspending a course switches its groups off
  // too, and skipping them left the course with no days — so the row fell
  // back to the package wording and the "Ukryte" list described the 3–5 class
  // as "pakiet · 4 lekcje / 90 min / lekcja". A paused class is still a class.
  for (const g of await getClassGroupsForTenant(tenantId, { includeInactive: true })) {
    const days = byService.get(g.service_id) ?? new Set<number>();
    days.add(g.day_of_week);
    byService.set(g.service_id, days);
  }
  return new Map(
    [...byService].map(([id, days]) => [
      id,
      WEEK_ORDER.filter((d) => days.has(d)).map((d) => WEEKDAY_SHORT[d].toLowerCase()).join(", "),
    ])
  );
}

export default async function ServicesPage() {
  const [services, classDays, runsGroups] = await Promise.all([
    getAllServices(),
    getClassDays(),
    getAdminTenantFeatures().then((f) => hasFeature(f, "grupy")),
  ]);
  const active = services.filter((s) => s.active);
  const inactive = services.filter((s) => !s.active);

  return (
    <PageShell
      title="Usługi"
      subtitle={`${active.length} aktywnych`}
      narrow
      actions={
<AddAction label="Dodaj usługę" href="/admin/uslugi/nowa" />
      }
    >

      <div className="space-y-2">
        {active.map((s) => <ServiceRow key={s.id} service={s} days={classDays.get(s.id)} runsGroups={runsGroups} />)}
      </div>

      {inactive.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-300">
            Ukryte ({inactive.length})
          </summary>
          <div className="mt-3 space-y-2">
            {inactive.map((s) => <ServiceRow key={s.id} service={s} days={classDays.get(s.id)} runsGroups={runsGroups} />)}
          </div>
        </details>
      )}
    </PageShell>
  );
}

/**
 * @param days  Which weekdays this class meets, when it has groups set up.
 * @param runsGroups  Whether this tenant sells time as classes at all. A
 *   suspended course can have no groups left to read days from — the 3–5
 *   class has none — and without this it fell back to the package wording,
 *   so a studio saw its own class described as "pakiet · 4 lekcje".
 */
function ServiceRow({
  service: s,
  days,
  runsGroups,
}: {
  service: Service;
  days?: string;
  runsGroups: boolean;
}) {
  // Days prove it. Failing that, a lesson count in a studio that sells time
  // as classes: a birthday party has no count and stays a booking.
  const isClass = Boolean(days) || (runsGroups && s.total_lessons != null);
  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:gap-4 ${!s.active ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-medium text-zinc-100">{s.name}</span>
          {s.total_lessons && (
            <span className="rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
              {isClass ? meetingsLabel(s.total_lessons) : `pakiet · ${lessonsLabel(s.total_lessons)}`}
            </span>
          )}
          {s.is_group && (
            <span className="rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
              grupowe · {s.max_participants} os.
            </span>
          )}
          <span className="font-mono text-sm text-[var(--color-accent)]">{s.price_pln} zł</span>
          <span className="font-mono text-xs text-zinc-500">
            {days ?? (s.total_lessons && !isClass ? `${s.duration_min} min / lekcja` : `${s.duration_min} min`)}
          </span>
        </div>
        {s.description && (
          <p className="mt-1 text-sm text-zinc-500 line-clamp-1">{s.description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <AdminLink
          href={`/admin/uslugi/${s.id}`}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          {isClass ? "Edytuj zajęcia" : "Edytuj"}
        </AdminLink>
        <form action={toggleServiceActiveAction}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="active" value={String(s.active)} />
          <Button type="submit" variant="secondary" size="sm">
            {s.active ? "Ukryj" : "Pokaż"}
          </Button>
        </form>
        <DeleteServiceButton id={s.id} name={s.name} />
      </div>
    </div>
  );
}
