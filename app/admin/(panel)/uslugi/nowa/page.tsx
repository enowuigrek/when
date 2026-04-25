import { ServiceForm } from "../service-form";
import { createServiceAction } from "../actions";

export const metadata = { title: "Nowa usługa", robots: { index: false } };

export default function NewServicePage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">Nowa usługa</h1>
      <ServiceForm action={createServiceAction} />
    </section>
  );
}
