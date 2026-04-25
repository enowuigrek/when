import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getBookingById } from "@/lib/db/bookings";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";
import { getSettings } from "@/lib/db/settings";
import { signBookingToken } from "@/lib/booking-token";

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
  const gcStart = booking.starts_at.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const gcEnd = booking.ends_at.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcTitle}&dates=${gcStart}/${gcEnd}&location=${gcLocation}`;
  const icalUrl = `/api/rezerwacja/${id}/ical`;

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

          {/* Calendar buttons */}
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              <CalendarIcon /> Google Calendar
            </a>
            <a
              href={icalUrl}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              <CalendarIcon /> Pobierz .ics
            </a>
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

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
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
