import { notFound } from "next/navigation";
import { AdminLink } from "@/components/admin-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId, getAdminTenantFeatures } from "@/lib/tenant";
import { hasFeature } from "@/lib/features";
import { getClassGroupsForTenant } from "@/lib/db/class-groups";
import { ServiceForm } from "../service-form";
import { SlotEditor, type SlotRow } from "../slot-editor";
import { updateServiceAction } from "../actions";
import type { Service } from "@/lib/types";
import { PageShell } from "@/components/ui/page-shell";

type Params = Promise<{ id: string }>;
type Search = Promise<{ nowa?: string }>;

export const metadata = { title: "Edytuj usługę", robots: { index: false } };

export default async function EditServicePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { id } = await params;
  const { nowa } = await searchParams;
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("services").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();

  if (!data) notFound();
  const service = data as Service;

  // A course is made in one place: what it is, what it costs, how long a
  // meeting runs, how many a month holds — and the days it meets. The classes
  // page used to hold the days, which split one definition across two screens.
  const runsGroups = hasFeature(await getAdminTenantFeatures(), "grupy");
  const slots: SlotRow[] = runsGroups
    ? (await getClassGroupsForTenant(tenantId, { includeInactive: true }))
        .filter((g) => g.service_id === id)
        .map((g) => ({
          id: g.id,
          dayOfWeek: g.day_of_week,
          startTime: g.start_time.slice(0, 5),
          endTime: g.end_time.slice(0, 5),
          ageLabel: g.age_label,
          minParticipants: g.min_participants,
          maxParticipants: g.max_participants,
          active: g.active,
        }))
    : [];
  const isClass = slots.length > 0;

  const boundAction = updateServiceAction.bind(null, id);

  return (
    <PageShell
      narrow
      title={isClass ? "Edytuj zajęcia" : "Edytuj usługę"}
      subtitle={service.name}
      back={
        <AdminLink href="/admin/uslugi" className="inline-flex text-sm text-zinc-500 hover:text-zinc-300">
          ← Usługi
        </AdminLink>
      }
    >
      {nowa && runsGroups && (
        <p className="mb-6 rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">
          Zapisane. Jeśli to zajęcia w stałe dni tygodnia, dodaj je poniżej.
        </p>
      )}

      <ServiceForm action={boundAction} service={service} classes={isClass} />

      {runsGroups && (
        <section className="mt-10 max-w-2xl">
          <h2 className="text-base font-semibold text-zinc-100">Dni i godziny</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {isClass
              ? "Każdy dzień to osobna grupa, do której dopisują się uczestnicy."
              : "Dodaj dzień, jeśli to zajęcia w stałe dni tygodnia. Usługa rezerwowana na wybrany termin nie potrzebuje żadnego."}
          </p>
          <SlotEditor serviceId={service.id} slots={slots} />
        </section>
      )}
    </PageShell>
  );
}
