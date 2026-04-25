import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getBookingById } from "@/lib/db/bookings";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";
import { getSettings } from "@/lib/db/settings";

export const metadata = {
  title: "Rezerwacja potwierdzona",
  robots: { index: false },
};

type Params = Promise<{ id: string }>;

export default async function SuccessPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [booking, s] = await Promise.all([getBookingById(id), getSettings()]);
  if (!booking) notFound();

  const service = (booking as { service?: { name: string; price_pln: number } })
    .service;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-xl px-6 py-16 md:py-24">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-2xl text-[var(--color-accent)]">
            ✓
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Rezerwacja potwierdzona
          </h1>
          <p className="mt-3 text-zinc-400">
            Do zobaczenia! Numer rezerwacji:{" "}
            <span className="font-mono text-zinc-300">{booking.id.slice(0, 8)}</span>
          </p>

          <dl className="mt-8 space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
            {service && (
              <Row label="Usługa" value={service.name} />
            )}
            <Row
              label="Data"
              value={formatWarsawDate(booking.starts_at)}
            />
            <Row
              label="Godzina"
              value={`${formatWarsawTime(booking.starts_at)} – ${formatWarsawTime(booking.ends_at)}`}
            />
            <Row label="Imię i nazwisko" value={booking.customer_name} />
            <Row
              label="Telefon"
              value={booking.customer_phone}
              mono
            />
            {service && (
              <Row label="Cena" value={`${service.price_pln} zł`} mono />
            )}
          </dl>

          <div className="mt-6 rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-5 text-sm text-zinc-400">
            <p>
              <span className="text-zinc-200">{s.business_name}</span>
              <br />
              {s.address_street}, {s.address_postal} {s.address_city}
              <br />
              {s.phone && (
                <a
                  href={`tel:${s.phone.replace(/\s/g, "")}`}
                  className="font-mono text-zinc-300 hover:text-[var(--color-accent)]"
                >
                  {s.phone}
                </a>
              )}
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              ← Wróć na stronę główną
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd
        className={`text-right text-zinc-100 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
