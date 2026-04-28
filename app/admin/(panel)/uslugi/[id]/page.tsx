import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";
import { ServiceForm } from "../service-form";
import { updateServiceAction, setServicePriceOverrideAction } from "../actions";
import type { Service } from "@/lib/types";
import { getStaffGroups, getServiceGroupPrices } from "@/lib/db/staff-groups";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Edytuj usługę", robots: { index: false } };

export default async function EditServicePage({ params }: { params: Params }) {
  const { id } = await params;
  const tenantId = await getAdminTenantId();
  const [{ data }, groups, overrides] = await Promise.all([
    createAdminClient().from("services").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle(),
    getStaffGroups(),
    getServiceGroupPrices(id),
  ]);

  if (!data) notFound();
  const service = data as Service;

  const boundAction = updateServiceAction.bind(null, id);

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Edytuj usługę</h1>
      <p className="text-sm text-zinc-500 mb-8">{service.name}</p>
      <ServiceForm action={boundAction} service={service} />

      {groups.length > 0 && (
        <div className="mt-12 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
          <h2 className="text-lg font-semibold text-zinc-100">Ceny per grupa</h2>
          <p className="mt-1 mb-5 text-sm text-zinc-500">
            Domyślna cena: <span className="font-mono text-zinc-300">{service.price_pln} zł</span> · {service.duration_min} min.
            Pozostaw pole puste, żeby usunąć override (grupa użyje ceny domyślnej).
          </p>

          <div className="space-y-3">
            {groups.map((g) => {
              const ov = overrides.find((o) => o.group_id === g.id);
              return (
                <form
                  key={g.id}
                  action={setServicePriceOverrideAction}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-4 py-3"
                >
                  <input type="hidden" name="service_id" value={id} />
                  <input type="hidden" name="group_id" value={g.id} />
                  <span className="min-w-[120px] text-sm font-medium text-zinc-200">{g.name}</span>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                    Cena
                    <input
                      type="number"
                      name="price_pln"
                      defaultValue={ov?.price_pln ?? ""}
                      placeholder={String(service.price_pln)}
                      min={0}
                      max={9999}
                      className="w-20 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    />
                    <span>zł</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                    Czas
                    <input
                      type="number"
                      name="duration_min"
                      defaultValue={ov?.duration_min ?? ""}
                      placeholder={String(service.duration_min)}
                      min={5}
                      max={480}
                      step={5}
                      className="w-20 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    />
                    <span>min</span>
                  </label>
                  <button
                    type="submit"
                    className="ml-auto rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-950 hover:bg-zinc-100"
                  >
                    Zapisz
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <div className="mt-12 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-5 py-6 text-center text-sm text-zinc-500">
          Aby ustawić ceny per grupa pracowników, najpierw <a href="/admin/pracownicy/grupy" className="text-zinc-300 underline hover:text-zinc-100">utwórz grupę</a>.
        </div>
      )}
    </section>
  );
}
