import Link from "next/link";
import { getAllTenantsWithStats, type TenantWithStats, type PlatformSummary } from "@/lib/db/super-admin";
import { NewTenantForm } from "./new-tenant-form";

export const metadata = { title: "Panel zarządcy", robots: { index: false } };

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function activityBadge(t: TenantWithStats) {
  if (t.bookings30d > 0) return { label: "aktywny", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" };
  if (t.lastBookingAt) return { label: "nieaktywny", cls: "border-amber-500/30 bg-amber-500/10 text-amber-400" };
  return { label: "nowy", cls: "border-blue-500/30 bg-blue-500/10 text-blue-400" };
}

export default async function WszystkoPage() {
  const { tenants, summary } = await getAllTenantsWithStats();

  const maxBookings = Math.max(...tenants.map((t) => t.bookingsTotal), 1);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Przegląd platformy WHEN</p>
        </div>
        <NewTenantForm />
      </div>

      <KpiGrid summary={summary} />

      {/* Activity chart — bookings per client (horizontal bars) */}
      <section className="mt-8 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">Rezerwacje na klienta</h2>
        <div className="space-y-3">
          {tenants.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <Link
                href={`/admin/wszystko/${t.id}`}
                className="w-36 shrink-0 truncate text-sm text-zinc-300 hover:text-zinc-100 transition-colors sm:w-48"
              >
                {t.name}
              </Link>
              <div className="flex flex-1 items-center gap-2">
                <div className="relative h-6 flex-1 overflow-hidden rounded bg-zinc-800/60">
                  {/* 30d bar (bright) */}
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-[var(--color-accent)]"
                    style={{ width: `${(t.bookings30d / maxBookings) * 100}%` }}
                  />
                  {/* Total bar (dim, behind) */}
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-zinc-700/50"
                    style={{ width: `${(t.bookingsTotal / maxBookings) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-[var(--color-accent)]/80"
                    style={{ width: `${(t.bookings30d / maxBookings) * 100}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right font-mono text-xs text-zinc-400">
                  <span className="text-zinc-200">{t.bookings30d}</span> / {t.bookingsTotal}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-600">Jasny = ostatnie 30 dni · Ciemny = ogółem</p>
      </section>

      {/* Client list */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-200">Klienci</h2>
        <Link
          href="/admin/wszystko/opinie"
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          Opinie{summary.feedbackNew > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 px-1.5 text-xs text-red-400">
              {summary.feedbackNew}
            </span>
          )}
        </Link>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800/60">
        {/* Desktop table */}
        <table className="hidden w-full text-sm sm:table">
          <thead>
            <tr className="border-b border-zinc-800/60 bg-zinc-900/80 text-left text-xs font-medium text-zinc-500">
              <th className="px-4 py-3">Klient</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Rez. 30d</th>
              <th className="px-4 py-3 text-right">Rez. total</th>
              <th className="px-4 py-3 text-right">Przychód 30d</th>
              <th className="px-4 py-3 text-right">Prac.</th>
              <th className="px-4 py-3 text-right">Ostatnia akt.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {tenants.map((t) => {
              const badge = activityBadge(t);
              const lastAct = t.lastBookingAt ? `${daysAgo(t.lastBookingAt)}d temu` : "—";
              return (
                <tr key={t.id} className="bg-zinc-900/20 transition-colors hover:bg-zinc-800/20">
                  <td className="px-4 py-3">
                    <Link href={`/admin/wszystko/${t.id}`} className="group">
                      <p className="font-medium text-zinc-100 transition-colors group-hover:text-[var(--color-accent)]">
                        {t.name}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-600">{t.email ?? t.slug}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">{t.bookings30d}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-500">{t.bookingsTotal}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-accent)]">{t.revenue30d} zł</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-500">{t.staffCount}</td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500">{lastAct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="divide-y divide-zinc-800/40 sm:hidden">
          {tenants.map((t) => {
            const badge = activityBadge(t);
            return (
              <Link
                key={t.id}
                href={`/admin/wszystko/${t.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-800/20"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-zinc-100">{t.name}</p>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-600">{t.email ?? t.slug}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm text-zinc-300">{t.bookings30d} rez.</p>
                  <p className="font-mono text-xs text-[var(--color-accent)]">{t.revenue30d} zł</p>
                </div>
                <span className="text-zinc-600">›</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiGrid({ summary }: { summary: PlatformSummary }) {
  const tiles = [
    { label: "Klientów", value: String(summary.totalTenants) },
    { label: "Aktywnych (30d)", value: String(summary.activeTenants30d) },
    { label: "Nowych w tym m-cu", value: String(summary.newTenantsThisMonth) },
    { label: "Rezerwacji ogółem", value: String(summary.totalBookings) },
    { label: "Przychód 30d", value: `${summary.revenue30d} zł` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tiles.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-4">
          <p className="text-xl font-semibold text-zinc-100">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{label}</p>
        </div>
      ))}
    </div>
  );
}
