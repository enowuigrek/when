import { notFound } from "next/navigation";
import { sectionHeading } from "@/components/ui/surface";
import { AdminLink } from "@/components/admin-link";
import { getCustomerStats, getAllCustomers, getFamily } from "@/lib/db/customers";
import { getCustomerPackages, getLessonPositions, type LessonPosition } from "@/lib/db/packages";
import { CustomerPackages } from "./packages";
import type { CustomerBooking } from "@/lib/db/customers";
import { getActiveStaff } from "@/lib/db/staff";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";
import { CustomerActions } from "./customer-actions";
import { BookingRow, StaffLine } from "@/components/ui/booking-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageShell } from "@/components/ui/page-shell";
import { StatTile } from "@/components/ui/stat-tile";

export const metadata = { title: "Profil klienta", robots: { index: false } };

type Params = Promise<{ id: string }>;

export default async function CustomerProfilePage({ params }: { params: Params }) {
  const { id } = await params;

  // id is the customer UUID — look up by id to get phone, then stats
  const all = await getAllCustomers();
  const customer = all.find((c) => c.id === id);
  if (!customer) notFound();

  const [stats, allStaff, packages, family] = await Promise.all([
    getCustomerStats(customer.phone, customer.name),
    getActiveStaff(),
    getCustomerPackages(customer.id),
    getFamily(customer),
  ]);
  // The customer's own lists say which lesson each booking is, using the same
  // date ordering as the schedule — so the two never disagree.
  const lessonPositions = await getLessonPositions(packages.map((p) => p.id));
  const now = new Date().toISOString();

  const upcoming = stats.bookings.filter((b) => (b.status === "confirmed") && b.starts_at >= now);
  const past = stats.bookings.filter((b) => b.starts_at < now || b.status === "no_show" || b.status === "cancelled");

  function statusBadge(status: string) {
    return <StatusBadge status={status} />;
  }

  return (
    <PageShell
      narrow
      title={customer.name}
      back={
        <AdminLink href="/admin/klienci" className="inline-flex text-sm text-zinc-500 hover:text-zinc-300">
          ← Klienci
        </AdminLink>
      }
      subtitle={
        <div className="flex flex-wrap gap-3">
          <a href={`tel:${customer.phone}`} className="font-mono hover:text-[var(--color-accent)]">{customer.phone}</a>
          {customer.email && <a href={`mailto:${customer.email}`} className="hover:text-[var(--color-accent)]">{customer.email}</a>}
        </div>
      }
      actions={
        <CustomerActions
          customerId={customer.id}
          customerName={customer.name}
          customerPhone={customer.phone}
          customerEmail={customer.email}
        />
      }
    >
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Wizyty" value={String(stats.totalVisits)} />
        <StatTile label="Wydatki" value={`${stats.totalSpent} zł`} tone="accent" />
        <StatTile label="Anulowane" value={String(stats.cancelledCount)} tone={stats.cancelledCount === 0 ? "muted" : "default"} />
        <StatTile label="Nie przyszedł" value={String(stats.noShowCount)} tone={stats.noShowCount > 0 ? "warn" : "default"} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.favoriteService && (
          <StatTile label="Ulubiona usługa" value={stats.favoriteService} size="sm" />
        )}
        {stats.avgDaysBetweenVisits !== null && (
          <StatTile label="Średnio co" value={`${stats.avgDaysBetweenVisits} dni`} size="sm" />
        )}
        {stats.lastVisit && (
          <StatTile label="Ostatnia wizyta" value={formatWarsawDate(stats.lastVisit)} size="sm" />
        )}
        {stats.nextVisit && (
          <StatTile label="Następna wizyta" value={`${formatWarsawDate(stats.nextVisit)}, ${formatWarsawTime(stats.nextVisit)}`} size="sm" tone="accent" />
        )}
      </div>

      {/* Who this person is filed with. The phone on a child's profile is the
          guardian's, and without saying so the number looks like the child's
          own — which is the sort of thing somebody dials before a class. */}
      {(family.guardian || family.children.length > 0) && (
        <div className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-5 py-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {family.guardian ? "Opiekun" : "Podopieczni"}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {family.guardian && (
              <li>
                <AdminLink
                  href={`/admin/klienci/${family.guardian.id}`}
                  className="text-sm text-zinc-300 hover:text-zinc-100"
                >
                  {family.guardian.name}
                </AdminLink>
                <span className="ml-2 font-mono text-xs text-zinc-600">
                  {family.guardian.phone}
                </span>
              </li>
            )}
            {family.children.map((c) => (
              <li key={c.id}>
                <AdminLink
                  href={`/admin/klienci/${c.id}`}
                  className="text-sm text-zinc-300 hover:text-zinc-100"
                >
                  {c.name}
                </AdminLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CustomerPackages packages={packages} />

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
          <h2 className={`mb-3 ${sectionHeading}`}>Nadchodzące</h2>
          <ul className="space-y-2">
            {upcoming.map((b) => (
              <BookingItem key={b.id} b={b} badge={statusBadge(b.status)} customer={customer} allStaff={allStaff} lessonPositions={lessonPositions} />
            ))}
          </ul>
        </div>
      )}

      {/* History */}
      <div className="mt-10">
        <h2 className={`mb-3 ${sectionHeading}`}>Historia wizyt</h2>
        {past.length === 0 ? (
          <p className="text-sm text-zinc-600">Brak historii.</p>
        ) : (
          <ul className="space-y-2">
            {past.map((b) => (
              <BookingItem key={b.id} b={b} badge={statusBadge(b.status)} customer={customer} allStaff={allStaff} lessonPositions={lessonPositions} />
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}



function BookingItem({
  b,
  badge,
  customer,
  allStaff,
  lessonPositions,
}: {
  b: CustomerBooking;
  badge: React.ReactNode;
  customer: { name: string; phone: string };
  allStaff: { id: string; name: string; color: string }[];
  lessonPositions: Map<string, LessonPosition>;
}) {
  const status = (b.status === "confirmed" || b.status === "cancelled" || b.status === "completed" || b.status === "no_show")
    ? b.status
    : "confirmed";
  const lesson = lessonPositions.get(b.id);
  return (
    <BookingRow
      allStaff={allStaff}
      badge={badge}
      // What this visit was agreed at, not what the service costs today. A
      // month of classes is paid once, so the other three meetings carry 0 —
      // reading the service price here billed the karnet four times over.
      price={b.price_pln_snapshot ?? b.service?.price_pln ?? null}
      // On a customer's page the service is what distinguishes one visit from
      // the next; who performed it is the supporting line.
      title={
        lesson ? `${b.service?.name ?? "—"} · lekcja ${lesson.index}/${lesson.totalLessons}` : (b.service?.name ?? "—")
      }
      subtitle={b.staff && <StaffLine name={b.staff.name} color={b.staff.color} />}
      booking={{
        id: b.id,
        startsAt: b.starts_at,
        endsAt: b.ends_at,
        customerName: customer.name,
        customerPhone: customer.phone,
        serviceName: b.service?.name ?? null,
        staffId: b.staff_id,
        staffName: b.staff?.name ?? null,
        staffColor: b.staff?.color ?? null,
        notes: b.notes,
        status,
        lessonLabel: lesson ? `${lesson.index}/${lesson.totalLessons}` : null,
      }}
    />
  );
}
