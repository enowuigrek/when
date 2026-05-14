import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getMainServices } from "@/lib/db/main-tenant";

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

  const services = await getMainServices();

  // Single service — skip the picker and go straight to booking
  if (services.length === 1) {
    redirect(`/rezerwacja/${services[0].slug}`);
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-16 md:py-24">
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
            <span className="font-mono text-[var(--color-accent)]">01</span>
            <span>Usługa</span>
            <span className="text-zinc-700">→</span>
            <span>Termin</span>
            <span className="text-zinc-700">→</span>
            <span>Dane</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Czego potrzebujesz?
          </h1>
          <p className="mt-3 text-zinc-400">
            Wybierz usługę, potem złapiemy wolny termin.
          </p>

          <div className="mt-8 space-y-3 sm:mt-10">
            {services.map((s) => (
              <Link
                key={s.id}
                href={`/rezerwacja/${s.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/80 sm:gap-6 sm:p-5"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-medium text-zinc-100 sm:text-lg">{s.name}</h2>
                  {s.description && (
                    <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{s.description}</p>
                  )}
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-zinc-500">
                    {s.duration_min} min
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="whitespace-nowrap font-mono text-lg font-semibold text-[var(--color-accent)] sm:text-xl">
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
