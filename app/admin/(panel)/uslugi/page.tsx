import { AdminLink } from "@/components/admin-link";
import { lessonsLabel } from "@/lib/service-label";
import { PageShell } from "@/components/ui/page-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";
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

export default async function ServicesPage() {
  const services = await getAllServices();
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
        {active.map((s) => <ServiceRow key={s.id} service={s} />)}
      </div>

      {inactive.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-300">
            Ukryte ({inactive.length})
          </summary>
          <div className="mt-3 space-y-2">
            {inactive.map((s) => <ServiceRow key={s.id} service={s} />)}
          </div>
        </details>
      )}
    </PageShell>
  );
}

function ServiceRow({ service: s }: { service: Service }) {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:gap-4 ${!s.active ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-medium text-zinc-100">{s.name}</span>
          {s.total_lessons && (
            <span className="rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
              pakiet · {lessonsLabel(s.total_lessons)}
            </span>
          )}
          {s.is_group && (
            <span className="rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
              grupowe · {s.max_participants} os.
            </span>
          )}
          <span className="font-mono text-sm text-[var(--color-accent)]">{s.price_pln} zł</span>
          <span className="font-mono text-xs text-zinc-500">
            {s.total_lessons ? `${s.duration_min} min / lekcja` : `${s.duration_min} min`}
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
          Edytuj
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
