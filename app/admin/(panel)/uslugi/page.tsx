import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";
import { toggleServiceActiveAction } from "./actions";
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
    <section className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Usługi</h1>
          <p className="mt-1 text-sm text-zinc-500">{active.length} aktywnych</p>
        </div>
        <Link
          href="/admin/uslugi/nowa"
          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          + Dodaj usługę
        </Link>
      </div>

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
    </section>
  );
}

function ServiceRow({ service: s }: { service: Service }) {
  return (
    <div className={`flex items-center gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 ${!s.active ? "opacity-50" : ""}`}>
      <div className="flex-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-medium text-zinc-100">{s.name}</span>
          {s.is_group && (
            <span className="rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
              grupowe · {s.max_participants} os.
            </span>
          )}
          <span className="font-mono text-sm text-[var(--color-accent)]">{s.price_pln} zł</span>
          <span className="font-mono text-xs text-zinc-500">{s.duration_min} min</span>
        </div>
        {s.description && (
          <p className="mt-1 text-sm text-zinc-500 line-clamp-1">{s.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/admin/uslugi/${s.id}`}
          className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
        >
          Edytuj
        </Link>
        <form action={toggleServiceActiveAction}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="active" value={String(s.active)} />
          <button
            type="submit"
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
          >
            {s.active ? "Ukryj" : "Pokaż"}
          </button>
        </form>
      </div>
    </div>
  );
}
