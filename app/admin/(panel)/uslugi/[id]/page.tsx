import { notFound } from "next/navigation";
import { AdminLink } from "@/components/admin-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";
import { ServiceForm } from "../service-form";
import { updateServiceAction } from "../actions";
import type { Service } from "@/lib/types";
import { PageShell } from "@/components/ui/page-shell";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Edytuj usługę", robots: { index: false } };

export default async function EditServicePage({ params }: { params: Params }) {
  const { id } = await params;
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("services").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();

  if (!data) notFound();
  const service = data as Service;

  const boundAction = updateServiceAction.bind(null, id);

  return (
    <PageShell
      narrow
      title="Edytuj usługę"
      subtitle={service.name}
      back={
        <AdminLink href="/admin/uslugi" className="inline-flex text-sm text-zinc-500 hover:text-zinc-300">
          ← Usługi
        </AdminLink>
      }
    >
      <ServiceForm action={boundAction} service={service} />

    </PageShell>
  );
}
