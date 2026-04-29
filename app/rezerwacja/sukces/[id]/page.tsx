import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getBookingByIdPublic, getSettingsForTenant } from "@/lib/db/for-tenant";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";
import { signBookingToken } from "@/lib/booking-token";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";

export const metadata = {
  title: "Rezerwacja potwierdzona",
  robots: { index: false },
};

type Params = Promise<{ id: string }>;

export default async function SuccessPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const booking = await getBookingByIdPublic(id);
  if (!booking) notFound();
  const s = await getSettingsForTenant(booking.tenant_id);

  const service = (booking as { service?: { name: string; price_pln: number } }).service;

  const cancelToken = signBookingToken(id, "cancel");
  const rescheduleToken = signBookingToken(id, "reschedule");

  // Google Calendar link
  const gcTitle = encodeURIComponent(
    service ? `${service.name} — ${s.business_name}` : s.business_name
  );
  const gcLocation = encodeURIComponent(
    [s.address_street, s.address_postal, s.address_city].filter(Boolean).join(", ")
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const gcStart = booking.starts_at.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const gcEnd = booking.ends_at.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const gcDetails = encodeURIComponent(`Zarządzaj rezerwacją: ${siteUrl}/rezerwacja/sukces/${id}`);
  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcTitle}&dates=${gcStart}/${gcEnd}&location=${gcLocation}&details=${gcDetails}`;
  // Absolute URL ending in .ics — required for iOS Safari to recognise
  // the file type and offer "Open in Calendar". Relative URLs without
  // the .ics extension get rendered as plain text on iPhone.
  const icalUrl = `${siteUrl || ""}/api/rezerwacja/${id}/event.ics`;

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

          {/* Smart calendar button — client component detects iOS/Android/other */}
          <div className="mt-6">
            <AddToCalendarButton googleCalUrl={googleCalUrl} icalUrl={icalUrl} />
          </div>

          {/* Self-service links */}
          {booking.status === "confirmed" && new Date(booking.starts_at) > new Date() && (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link
                href={`/rezerwacja/zmien/${rescheduleToken}`}
                className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
              >
                Zmień termin
              </Link>
              <Link
                href={`/rezerwacja/anuluj/${cancelToken}`}
                className="text-zinc-500 underline-offset-2 hover:text-red-400 hover:underline"
              >
                Anuluj rezerwację
              </Link>
            </div>
          )}

          <div className="mt-8">
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
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
