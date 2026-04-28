import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { verifyBookingToken } from "@/lib/booking-token";
import { getBookingById } from "@/lib/db/bookings";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";
import { customerCancelAction } from "./actions";

export const metadata = { title: "Anuluj rezerwację", robots: { index: false } };

type Params = Promise<{ token: string }>;

export default async function CustomerCancelPage({ params }: { params: Params }) {
  const { token } = await params;
  const bookingId = verifyBookingToken(token, "cancel");
  if (!bookingId) notFound();

  const booking = await getBookingById(bookingId);
  if (!booking) notFound();

  // Already cancelled / completed — show friendly message
  if (booking.status !== "confirmed") {
    const service = (booking as { service?: { name: string } }).service;
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <section className="mx-auto max-w-lg px-6 py-16 text-center">
            <div className="mb-4 text-4xl">✓</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {booking.status === "cancelled" ? "Rezerwacja już anulowana" : "Rezerwacja zakończona"}
            </h1>
            <p className="mt-3 text-sm text-zinc-400">
              {service?.name && <><span className="text-zinc-200">{service.name}</span> · </>}
              {formatWarsawDate(booking.starts_at)}, godz. {formatWarsawTime(booking.starts_at)}
            </p>
            <p className="mt-4 text-sm text-zinc-500">
              {booking.status === "cancelled"
                ? "Ta rezerwacja została już wcześniej anulowana."
                : "Ta wizyta już się odbyła."}
            </p>
            <a
              href="/rezerwacja"
              className="mt-8 inline-block rounded-lg bg-[var(--color-accent)] px-6 py-3 font-medium text-zinc-950 transition-colors hover:opacity-90"
            >
              Zarezerwuj ponownie
            </a>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const isPast = new Date(booking.starts_at) <= new Date();
  const service = (booking as { service?: { name: string } }).service;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-lg px-6 py-16">
          <h1 className="text-2xl font-semibold tracking-tight">Anulowanie rezerwacji</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Czy na pewno chcesz anulować poniższą rezerwację?
          </p>

          <dl className="mt-6 space-y-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
            {service && <Row label="Usługa" value={service.name} />}
            <Row label="Data" value={formatWarsawDate(booking.starts_at)} />
            <Row label="Godzina" value={formatWarsawTime(booking.starts_at)} />
            <Row label="Imię" value={booking.customer_name} />
          </dl>

          {isPast ? (
            <p className="mt-6 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
              Ta rezerwacja już minęła lub właśnie trwa — nie można jej anulować.
            </p>
          ) : (
            <form action={customerCancelAction} className="mt-6 flex gap-3">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="rounded-full border border-red-900/60 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:border-red-700 hover:text-red-300"
              >
                Tak, anuluj
              </button>
              <a
                href="/"
                className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
              >
                Wróć
              </a>
            </form>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-100">{value}</dd>
    </div>
  );
}
