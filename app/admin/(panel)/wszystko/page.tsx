import { redirect } from "next/navigation";
import { isSessionSuperAdmin } from "@/lib/auth/super-admin";
import { getAllTenantsWithStats, type TenantRow, type SuperAdminSummary } from "@/lib/db/super-admin";
import { switchTenantAction } from "../super-admin-actions";
import { NewTenantForm } from "./new-tenant-form";

export const metadata = { title: "Panel zarządcy", robots: { index: false } };

export default async function WszystkoPage() {
  if (!(await isSessionSuperAdmin())) redirect("/admin");

  const { tenants, summary } = await getAllTenantsWithStats();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Panel zarządcy</h1>
          <p className="mt-1 text-sm text-zinc-500">Wszystkie konta w systemie</p>
        </div>
        <NewTenantForm />
      </div>

      <KpiGrid summary={summary} />

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-800/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/60 bg-zinc-900/80">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Nazwa</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-zinc-500 sm:table-cell">Slug / Email</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Rez.</th>
              <th className="hidden px-4 py-3 text-right text-xs font-medium text-zinc-500 sm:table-cell">Prac.</th>
              <th className="hidden px-4 py-3 text-right text-xs font-medium text-zinc-500 sm:table-cell">Usł.</th>
              <th className="hidden px-4 py-3 text-right text-xs font-medium text-zinc-500 md:table-cell">Od</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {tenants.map((t) => (
              <TenantRow key={t.id} tenant={t} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiGrid({ summary }: { summary: SuperAdminSummary }) {
  const tiles = [
    { label: "Klientów", value: summary.tenantCount },
    { label: "Rezerwacji", value: summary.totalBookings },
    { label: "Pracowników", value: summary.totalStaff },
    { label: "Usług", value: summary.totalServices },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-4">
          <p className="text-2xl font-semibold text-zinc-100">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

function TenantRow({ tenant: t }: { tenant: TenantRow }) {
  const createdDate = new Date(t.created_at).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });

  return (
    <tr className="bg-zinc-900/20 transition-colors hover:bg-zinc-800/20">
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-zinc-100">{t.name}</span>
          {t.is_super_admin && (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-[10px] text-amber-400">
              admin
            </span>
          )}
          {t.kind === "main" && (
            <span className="rounded border border-blue-500/30 bg-blue-500/10 px-1 py-0.5 text-[10px] text-blue-400">
              main
            </span>
          )}
        </div>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <p className="font-mono text-xs text-zinc-400">{t.slug}</p>
        {t.email && <p className="mt-0.5 text-xs text-zinc-600">{t.email}</p>}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm text-zinc-300">{t.bookingCount}</td>
      <td className="hidden px-4 py-3 text-right font-mono text-sm text-zinc-300 sm:table-cell">{t.staffCount}</td>
      <td className="hidden px-4 py-3 text-right font-mono text-sm text-zinc-300 sm:table-cell">{t.serviceCount}</td>
      <td className="hidden px-4 py-3 text-right text-xs text-zinc-500 md:table-cell">{createdDate}</td>
      <td className="px-4 py-3 text-right">
        <form action={switchTenantAction}>
          <input type="hidden" name="tenantId" value={t.id} />
          <button
            type="submit"
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            Wejdź
          </button>
        </form>
      </td>
    </tr>
  );
}
