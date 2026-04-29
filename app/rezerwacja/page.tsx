import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getServices } from "@/lib/db/services";

export const metadata = {
  title: "Rezerwacja",
  description: "Wybierz usługę i zarezerwuj termin online.",
};

type SearchParams = Promise<{ service?: string }>;

export default async function ServicePickPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { service } = await searchParams;
  if (service) {
    redirect(`/rezerwacja/${service}`);
  }

  const services = await getServices();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <span className="font-mono text-[var(--color-accent)]">01</span>
            <span>Usługa</span>
            <span className="text-zinc-700">→</span>
            <span>Termin</span>
            <span className="text-zinc-700">→</span>
            <span>Dane</span>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Czego potrzebujesz?
          </h1>
          <p className="mt-3 text-zinc-400">
            Wybierz usługę, potem złapiemy wolny termin.
          </p>

          <div className="mt-10 space-y-3">
            {services.map((s) => (
              <Link
                key={s.id}
                href={`/rezerwacja/${s.slug}`}
                className="group flex items-center justify-between gap-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
              >
                <div>
                  <h2 className="text-lg font-medium text-zinc-100">{s.name}</h2>
                  {s.description && (
                    <p className="mt-1 text-sm text-zinc-400">{s.description}</p>
                  )}
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-zinc-500">
                    {s.duration_min} min
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl font-semibold text-[var(--color-accent)]">
                    {s.price_pln} zł
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 transition-colors group-hover:text-zinc-300">
                    Wybierz →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
