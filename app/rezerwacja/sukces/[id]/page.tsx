import Link from "next/link";
import { notFound } from "next/navigation";
import { WidgetHeader } from "@/components/widget-header";
import { SiteFooter } from "@/components/site-footer";
import { ThemeApplier } from "@/components/theme-applier";
import {
  getBookingByIdPublic,
  getSettingsForTenant,
  getTenantSlugById,
  getPackageBookingsForTenant,
} from "@/lib/db/for-tenant";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";
import { signBookingToken } from "@/lib/booking-token";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";
import { fmtUtc } from "@/lib/ics";
import { accentFg } from "@/lib/color-utils";

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const booking = /^[0-9a-f-]{36}$/i.test(id) ? await getBookingByIdPublic(id) : null;
  const businessName = booking
    ? ((await getSettingsForTenant(booking.tenant_id)).business_name)
    : "when?";
  return {
    title: `Rezerwacja potwierdzona — ${businessName}`,
    robots: { index: false },
  };
}

type Params = Promise<{ id: string }>;

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1";
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const booking = await getBookingByIdPublic(id);
  if (!booking) notFound();
  const [s, tenantSlug] = await Promise.all([
    getSettingsForTenant(booking.tenant_id),
    getTenantSlugById(booking.tenant_id),
  ]);

  const service = (
    booking as {
      service?: { name: string; price_pln: number; participants_label: string | null };
    }
  ).service;
  // What the customer agreed to, not what the service costs today. For a
  // per-person workshop the two differ by the number of people.
  const paid =
    (booking as { price_pln_snapshot: number | null }).price_pln_snapshot ??
    service?.price_pln ??
    null;
  const participants = (booking as { participants: number | null }).participants;

  // A package is one decision and several appointments; confirming only the
  // first would read as though the rest had not been booked.
  const packageId = (booking as { package_id: string | null }).package_id;
  const series = packageId
    ? await getPackageBookingsForTenant(packageId, booking.tenant_id)
    : [];
  const accent = s.color_accent ?? "#d4a26a";
  const theme = (s.theme === "system" ? "dark" : s.theme) as "light" | "dark";

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
  const gcStart = fmtUtc(booking.starts_at);
  const gcEnd = fmtUtc(booking.ends_at);
  const gcDetails = encodeURIComponent(`Zarządzaj rezerwacją: ${siteUrl}/rezerwacja/sukces/${id}`);
  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcTitle}&dates=${gcStart}/${gcEnd}&location=${gcLocation}&details=${gcDetails}`;
  // The /api/.../event.ics endpoint is opened in a new tab by the
  // button. iOS Safari shows its native calendar preview with an
  // "Add to Calendar" button; same-tab navigation to .ics or
  // top-level data: URLs are blocked.
  const icalUrl = `${siteUrl}/api/rezerwacja/${id}/event.ics`;

  return (
    <div
      // The /rezerwacja layout paints WHEN's own theme, which is dark. This
      // page belongs to the tenant whose booking it confirms, so it has to
      // take the theme back — otherwise a light-themed studio gets its dark
      // text on the layout's near-black panel and the page reads as blank.
      data-theme={theme}
      className="flex min-h-screen flex-col"
      style={{
        backgroundColor: theme === "light" ? "#f4f4f5" : "#09090b",
        "--color-accent": accent,
        "--color-accent-hover": accent,
        "--color-accent-fg": accentFg(accent),
      } as React.CSSProperties}
    >
      <ThemeApplier theme={theme} />
      {!isEmbed && tenantSlug && <WidgetHeader settings={s} tenantSlug={tenantSlug} />}
      <main className="flex-1">
        <section className={`mx-auto max-w-xl px-5 sm:px-6 ${isEmbed ? "py-8" : "py-10 sm:py-16 md:py-24"}`}>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-2xl text-[var(--color-accent)]">
            ✓
          </div>
          {booking.status === "pending_payment" ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                Płatność w toku…
              </h1>
              <p className="mt-3 text-zinc-400">
                Czekamy na potwierdzenie płatności. Gdy przejdzie — wyślemy Ci e-mail z potwierdzeniem rezerwacji.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                Rezerwacja potwierdzona
              </h1>
              <p className="mt-3 text-zinc-400">
                Do zobaczenia! Numer rezerwacji:{" "}
                <span className="font-mono text-zinc-300">{booking.id.slice(0, 8)}</span>
              </p>
            </>
          )}

          <dl className="mt-8 space-y-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 sm:space-y-4 sm:p-6">
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
            {participants !== null && (
              <Row
                label={service?.participants_label ?? "Liczba osób"}
                value={String(participants)}
                mono
              />
            )}
            {paid !== null && <Row label="Cena" value={`${paid} zł`} mono />}
          </dl>

          {series.length > 1 && (
            <div className="mt-6 rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Wszystkie spotkania z tego zapisu
              </p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {series.map((b, i) => (
                  <li key={b.id} className="flex items-baseline gap-2 text-sm text-zinc-300">
                    <span className="font-mono text-xs text-zinc-500">
                      {i + 1}/{series.length}
                    </span>
                    {formatWarsawDate(b.starts_at)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-5 text-sm text-zinc-400">
            <p className="leading-relaxed">
              <span className="text-zinc-200">{s.business_name}</span>
              {(s.address_street || s.address_postal || s.address_city) && (
                <>
                  <br />
                  {[
                    s.address_street,
                    [s.address_postal, s.address_city].filter(Boolean).join(" "),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </>
              )}
              {s.phone && (
                <>
                  <br />
                  <a
                    href={`tel:${s.phone.replace(/\s/g, "")}`}
                    className="font-mono text-zinc-300 hover:text-[var(--color-accent)]"
                  >
                    {s.phone}
                  </a>
                </>
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

          {!isEmbed && tenantSlug && (
            <div className="mt-8">
              <Link
                href={`/widget/${tenantSlug}`}
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                ← Wróć na stronę główną
              </Link>
            </div>
          )}
        </section>
      </main>
      {!isEmbed && <SiteFooter />}
    </div>
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
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-xs uppercase tracking-wider text-zinc-500 sm:text-sm sm:normal-case sm:tracking-normal">{label}</dt>
      <dd
        className={`text-zinc-100 sm:text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
