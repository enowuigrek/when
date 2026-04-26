import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomerStats, getAllCustomers } from "@/lib/db/customers";
import type { CustomerBooking } from "@/lib/db/customers";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";
import { CustomerActions } from "./customer-actions";

export const metadata = { title: "Profil klienta", robots: { index: false } };

type Params = Promise<{ id: string }>;

export default async function CustomerProfilePage({ params }: { params: Params }) {
  const { id } = await params;

  // id is the customer UUID — look up by id to get phone, then stats
  const all = await getAllCustomers();
  const customer = all.find((c) => c.id === id);
  if (!customer) notFound();

  const stats = await getCustomerStats(customer.phone);
  const now = new Date().toISOString();

  const upcoming = stats.bookings.filter((b) => (b.status === "confirmed") && b.starts_at >= now);
  const past = stats.bookings.filter((b) => b.starts_at < now || b.status === "no_show" || b.status === "cancelled");

  function statusBadge(status: string) {
    if (status === "confirmed") return <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">potwierdzona</span>;
    if (status === "cancelled") return <span className="rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-400">anulowana</span>;
    if (status === "no_show") return <span className="rounded-full bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-400">nie przyszedł</span>;
    if (status === "completed") return <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">zakończona</span>;
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/klienci" className="mb-6 inline-flex text-sm text-zinc-500 hover:text-zinc-300">
        ← Klienci
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl font-semibold text-zinc-200">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-zinc-400">
              <a href={`tel:${customer.phone}`} className="font-mono hover:text-[var(--color-accent)]">{customer.phone}</a>
              {customer.email && <a href={`mailto:${customer.email}`} className="hover:text-[var(--color-accent)]">{customer.email}</a>}
            </div>
          </div>
        </div>
        <CustomerActions
          customerId={customer.id}
          customerName={customer.name}
          customerPhone={customer.phone}
          customerEmail={customer.email}
        />
      </div>

      {/* Stats grid */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Wizyty" value={String(stats.totalVisits)} />
        <StatCard label="Wydatki" value={`${stats.totalSpent} zł`} accent />
        <StatCard label="Anulowane" value={String(stats.cancelledCount)} dim={stats.cancelledCount === 0} />
        <StatCard label="Nie przyszedł" value={String(stats.noShowCount)} warn={stats.noShowCount > 0} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.favoriteService && (
          <InfoCard label="Ulubiona usługa" value={stats.favoriteService} />
        )}
        {stats.avgDaysBetweenVisits !== null && (
          <InfoCard label="Średnio co" value={`${stats.avgDaysBetweenVisits} dni`} />
        )}
        {stats.lastVisit && (
          <InfoCard label="Ostatnia wizyta" value={formatWarsawDate(stats.lastVisit)} />
        )}
        {stats.nextVisit && (
          <InfoCard label="Następna wizyta" value={`${formatWarsawDate(stats.nextVisit)}, ${formatWarsawTime(stats.nextVisit)}`} highlight />
        )}
      </div>

      {/* Loyalty tag */}
      {stats.totalVisits >= 10 && (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-medium text-[var(--color-accent)]">
          Stały klient
        </div>
      )}
      {stats.totalVisits >= 3 && stats.totalVisits < 10 && (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-xs font-medium text-zinc-400">
          Regularny klient
        </div>
      )}

      {/* Upcoming bookings */}
      {upcoming.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Nadchodzące</h2>
          <ul className="space-y-2">
            {upcoming.map((b) => (
              <BookingItem key={b.id} b={b} badge={statusBadge(b.status)} />
            ))}
          </ul>
        </div>
      )}

      {/* History */}
      <div className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Historia wizyt</h2>
        {past.length === 0 ? (
          <p className="text-sm text-zinc-600">Brak historii.</p>
        ) : (
          <ul className="space-y-2">
            {past.map((b) => (
              <BookingItem key={b.id} b={b} badge={statusBadge(b.status)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, dim, warn }: { label: string; value: string; accent?: boolean; dim?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent ? "text-[var(--color-accent)]" : warn ? "text-amber-400" : dim ? "text-zinc-700" : "text-zinc-100"}`}>
        {value}
      </p>
    </div>
  );
}

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-sm font-medium ${highlight ? "text-[var(--color-accent)]" : "text-zinc-200"}`}>{value}</p>
    </div>
  );
}

function BookingItem({ b, badge }: { b: CustomerBooking; badge: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-4 py-3">
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm text-zinc-300">{formatWarsawTime(b.starts_at)}</p>
        <p className="font-mono text-xs text-zinc-600">{formatWarsawDate(b.starts_at)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{b.service?.name ?? "—"}</span>
          {badge}
        </div>
        {b.staff && (
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: b.staff.color }} />
            <span className="text-xs text-zinc-500">{b.staff.name}</span>
          </div>
        )}
      </div>
      {b.service && (
        <span className="shrink-0 font-mono text-sm text-zinc-400">{b.service.price_pln} zł</span>
      )}
    </li>
  );
}
