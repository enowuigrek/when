import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HoursTable } from "@/components/hours-table";
import { getServices, getBusinessHours } from "@/lib/db/services";
import { business } from "@/lib/business";

export default async function Home() {
  const [services, hours] = await Promise.all([getServices(), getBusinessHours()]);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-zinc-800/60">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,162,106,0.15),transparent_50%)]"
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:py-32">
            <div className="flex flex-col justify-center">
              <p className="mb-4 text-sm font-medium uppercase tracking-widest text-[var(--color-accent)]">
                {business.address.city}
              </p>
              <h1 className="text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
                {business.tagline}
              </h1>
              <p className="mt-6 max-w-md text-lg text-zinc-400">
                {business.shortDescription}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/rezerwacja"
                  className="rounded-full bg-[var(--color-accent)] px-6 py-3 font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                  Zarezerwuj wizytę
                </Link>
                <a
                  href="#uslugi"
                  className="rounded-full border border-zinc-700 px-6 py-3 font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
                >
                  Zobacz cennik
                </a>
              </div>
            </div>

            <div className="hidden md:flex md:items-center md:justify-end">
              <div className="relative">
                <div className="absolute -inset-8 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
                <div className="relative flex h-80 w-80 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 font-serif text-9xl font-light tracking-tight text-zinc-100">
                  {business.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="uslugi" className="border-b border-zinc-800/60 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Usługi
                </h2>
                <p className="mt-2 text-zinc-400">
                  Wszystko czego potrzebujesz. Nic ponad to.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {services.map((s) => (
                <Link
                  key={s.id}
                  href={`/rezerwacja?service=${s.slug}`}
                  className="group flex items-start justify-between gap-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-medium text-zinc-100">
                      {s.name}
                    </h3>
                    {s.description && (
                      <p className="mt-2 text-sm text-zinc-400">
                        {s.description}
                      </p>
                    )}
                    <p className="mt-3 font-mono text-xs uppercase tracking-wider text-zinc-500">
                      {s.duration_min} min
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-2xl font-semibold text-[var(--color-accent)]">
                      {s.price_pln} zł
                    </div>
                    <div className="mt-2 text-xs text-zinc-500 transition-colors group-hover:text-zinc-300">
                      Rezerwuj →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* HOURS + CONTACT */}
        <section id="godziny" className="py-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Godziny pracy
              </h2>
              <p className="mt-2 text-zinc-400">
                Najszybciej zarezerwujesz online. Bez telefonu, bez czekania.
              </p>
              <div className="mt-8">
                <HoursTable hours={hours} />
              </div>
            </div>

            <div id="kontakt">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Kontakt
              </h2>
              <p className="mt-2 text-zinc-400">
                Wpadnij, zadzwoń, napisz — albo zarezerwuj online.
              </p>

              <dl className="mt-8 space-y-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-zinc-500">
                    Adres
                  </dt>
                  <dd className="mt-1 text-zinc-200">
                    <a
                      href={business.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--color-accent)]"
                    >
                      {business.address.street}
                      <br />
                      {business.address.postal} {business.address.city}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-zinc-500">
                    Telefon
                  </dt>
                  <dd className="mt-1">
                    <a
                      href={business.phoneHref}
                      className="font-mono text-zinc-200 hover:text-[var(--color-accent)]"
                    >
                      {business.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-zinc-500">
                    Email
                  </dt>
                  <dd className="mt-1">
                    <a
                      href={`mailto:${business.email}`}
                      className="text-zinc-200 hover:text-[var(--color-accent)]"
                    >
                      {business.email}
                    </a>
                  </dd>
                </div>
              </dl>

              <div className="mt-8">
                <Link
                  href="/rezerwacja"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                  Zarezerwuj online →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
