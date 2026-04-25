import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceForm } from "../service-form";
import { updateServiceAction } from "../actions";
import type { Service } from "@/lib/types";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Edytuj usługę", robots: { index: false } };

export default async function EditServicePage({ params }: { params: Params }) {
  const { id } = await params;
  const { data } = await createAdminClient()
    .from("services")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const service = data as Service;

  const boundAction = updateServiceAction.bind(null, id);

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Edytuj usługę</h1>
      <p className="text-sm text-zinc-500 mb-8">{service.name}</p>
      <ServiceForm action={boundAction} service={service} />
    </section>
  );
}
