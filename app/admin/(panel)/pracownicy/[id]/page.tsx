import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { AdminLink } from "@/components/admin-link";
import {
  getStaffById,
  getStaffServicesWithPricing,
  getStaffBookings,
  getActiveStaff,
} from "@/lib/db/staff";
import { formatWarsawDate, formatWarsawTime, warsawToday } from "@/lib/slots";
import { PageShell } from "@/components/ui/page-shell";
import { Segmented } from "@/components/ui/segmented";
import { StatusBadge } from "@/components/ui/status-badge";
import { BookingManagementButton, type BookingForModal } from "@/components/booking-management-modal";
import { buttonClasses } from "@/components/ui/button";
import { ServicePrices } from "./service-prices";

export const metadata = { title: "Pracownik", robots: { index: false } };

type Tab = "nadchodzace" | "historia";

const card = "rounded-xl border border-zinc-800/60 bg-zinc-900/40";
const heading = "text-xs font-medium uppercase tracking-wider text-zinc-500";

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
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
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
        <Stat label="Nadchodzące" value={String(upcoming.length)} />
        <Stat label="Zrealizowane — 30 dni" value={String(done.length)} />
        <Stat label="Przychód — 30 dni" value={`${revenue.toLocaleString("pl-PL")} zł`} accent />
        <Stat label="Usługi" value={String(services.length)} />
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
            {shown.slice(0, 40).map((b) => {
              const modal: BookingForModal = {
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
              };
              return (
                <li key={b.id}>
                  <BookingManagementButton
                    booking={modal}
                    allStaff={allStaff}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:border-zinc-700 ${card}`}
                  >
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm text-zinc-300">{formatWarsawTime(b.startsAt)}</p>
                      <p className="font-mono text-xs text-zinc-600">{formatWarsawDate(b.startsAt)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200">{b.customerName}</span>
                        {b.status !== "confirmed" && <StatusBadge status={b.status} />}
                      </div>
                      {b.serviceName && <p className="truncate text-xs text-zinc-500">{b.serviceName}</p>}
                    </div>
                    {b.pricePln !== null && (
                      <span className="shrink-0 font-mono text-sm text-zinc-400">{b.pricePln} zł</span>
                    )}
                  </BookingManagementButton>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`${card} p-4`}>
      <p className={heading}>{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accent ? "text-[var(--color-accent)]" : "text-zinc-100"}`}>
        {value}
      </p>
    </div>
  );
}
