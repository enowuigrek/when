import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { AdminLink } from "@/components/admin-link";
import {
  getStaffById,
  getStaffServicesWithPricing,
  getStaffBookings,
  getActiveStaff,
} from "@/lib/db/staff";
import { warsawToday } from "@/lib/slots";
import { PageShell } from "@/components/ui/page-shell";
import { StatTile } from "@/components/ui/stat-tile";
import { card, sectionHeading as heading } from "@/components/ui/surface";
import { Segmented } from "@/components/ui/segmented";
import { StatusBadge } from "@/components/ui/status-badge";
import { BookingRow } from "@/components/ui/booking-row";
import { buttonClasses } from "@/components/ui/button";
import { ServicePrices } from "./service-prices";

export const metadata = { title: "Pracownik", robots: { index: false } };

type Tab = "nadchodzace" | "historia";



export default async function StaffProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ zakladka?: string }>;
}) {
  const { id } = await params;
  const { zakladka } = await searchParams;
  const tab: Tab = zakladka === "historia" ? "historia" : "nadchodzace";

  const demoSlug = (await headers()).get("x-demo-slug");
  const adminBase = demoSlug ? `/demo/${demoSlug}` : "/admin";

  const [staff, services, bookings, allStaff] = await Promise.all([
    getStaffById(id),
    getStaffServicesWithPricing(id),
    getStaffBookings(id),
    getActiveStaff(),
  ]);
  if (!staff) notFound();

  const now = new Date().toISOString();
  const upcoming = bookings
    .filter((b) => b.startsAt >= now && b.status === "confirmed")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = bookings
    .filter((b) => b.startsAt < now || b.status !== "confirmed")
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  // Revenue over the last 30 days, counting only what actually happened.
  // Derived from `now` rather than reading the clock a second time: two
  // readings during one render can disagree, and the lint rule that flags
  // Date.now() during render is right to — one timestamp for the whole page.
  const since = new Date(Date.parse(now) - 30 * 864e5).toISOString();
  const done = bookings.filter(
    (b) => b.startsAt >= since && b.startsAt < now && b.status !== "cancelled" && b.status !== "no_show"
  );
  const revenue = done.reduce((sum, b) => sum + (b.pricePln ?? 0), 0);

  const today = warsawToday();
  const shown = tab === "nadchodzace" ? upcoming : past;

  function tabHref(t: Tab) {
    return `${adminBase}/pracownicy/${staff!.id}?zakladka=${t}`;
  }

  return (
    <PageShell
      narrow
      title={staff.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: staff.color }} />
            kolor w harmonogramie
          </span>
          {!staff.active && <span className="text-amber-400">nieaktywny</span>}
          {staff.email && <span className="font-mono">{staff.email}</span>}
        </span>
      }
      back={
        <AdminLink href="/admin/pracownicy" className="inline-flex text-sm text-zinc-500 hover:text-zinc-300">
          ← Pracownicy
        </AdminLink>
      }
      actions={
        <>
          <AdminLink
            href={`/admin/harmonogram?widok=tydzien&od=${today}&pracownicy=${staff.id}`}
            className={buttonClasses({ variant: "secondary", radius: "full" })}
          >
            Harmonogram
          </AdminLink>
          <AdminLink
            href={`/admin/pracownicy/${staff.id}/edytuj`}
            className={buttonClasses({ variant: "secondary", radius: "full" })}
          >
            Edytuj
          </AdminLink>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Nadchodzące" value={String(upcoming.length)} />
        <StatTile label="Zrealizowane — 30 dni" value={String(done.length)} />
        <StatTile label="Przychód — 30 dni" value={`${revenue.toLocaleString("pl-PL")} zł`} tone="accent" />
        <StatTile label="Usługi" value={String(services.length)} />
      </div>

      {/* ── Services and prices ─────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={heading}>Usługi i ceny</h2>
          <p className="text-xs text-zinc-600">
            Puste pole = cena bazowa usługi.
          </p>
        </div>
        <ServicePrices staffId={staff.id} services={services} />
      </div>

      {/* ── Bookings ────────────────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className={heading}>Rezerwacje</h2>
          <Segmented
            value={tab}
            hrefFor={tabHref}
            options={[
              { value: "nadchodzace" as Tab, label: "Nadchodzące", count: upcoming.length },
              { value: "historia" as Tab, label: "Historia", count: past.length },
            ]}
          />
        </div>

        {shown.length === 0 ? (
          <p className={`${card} px-4 py-6 text-center text-sm text-zinc-500`}>
            {tab === "nadchodzace" ? "Nic nie czeka." : "Brak historii."}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {shown.slice(0, 40).map((b) => (
              <BookingRow
                key={b.id}
                allStaff={allStaff}
                price={b.pricePln}
                badge={b.status !== "confirmed" ? <StatusBadge status={b.status} /> : undefined}
                // Mirror of the customer page: there the service leads and the
                // person supports; here it is the other way round.
                title={b.customerName}
                subtitle={
                  b.serviceName && <span className="truncate text-xs text-zinc-500">{b.serviceName}</span>
                }
                booking={{
                  id: b.id,
                  startsAt: b.startsAt,
                  endsAt: b.endsAt,
                  customerName: b.customerName,
                  customerPhone: b.customerPhone,
                  serviceName: b.serviceName,
                  staffId: staff!.id,
                  staffName: staff!.name,
                  staffColor: staff!.color,
                  notes: b.notes,
                  status: b.status,
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}

