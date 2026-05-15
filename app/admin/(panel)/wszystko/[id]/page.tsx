import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isSessionSuperAdmin } from "@/lib/auth/super-admin";
import { getTenantDetail, getFeedbackForTenant } from "@/lib/db/super-admin";
import { switchTenantAction } from "../../super-admin-actions";
import { TenantNotesForm } from "./notes-form";
import { formatWarsawDate } from "@/lib/slots";

export const metadata = { title: "Klient", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

export default async function TenantDetailPage({ params }: Props) {
  if (!(await isSessionSuperAdmin())) redirect("/admin");

  const { id } = await params;
  const tenant = await getTenantDetail(id);
  if (!tenant) notFound();

  const feedback = await getFeedbackForTenant(id);

  const createdDate = new Date(tenant.created_at).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const statusMap: Record<string, string> = {
    new: "Nowa",
    read: "Przeczytana",
    resolved: "Rozwiązana",
  };

  const categoryMap: Record<string, string> = {
    general: "Ogólne",
    bug: "Błąd",
    feature: "Pomysł",
    question: "Pytanie",
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/wszystko"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← Wróć do listy
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{tenant.name}</h1>
          {tenant.is_super_admin && (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">admin</span>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">Informacje</h2>
          <dl className="space-y-3 text-sm">
            <InfoRow label="Email" value={tenant.email ?? "—"} />
            <InfoRow label="Slug" value={tenant.slug} mono />
            <InfoRow label="Typ" value={tenant.kind} />
            <InfoRow label="Założone" value={createdDate} />
            <InfoRow
              label="Ostatnia aktywność"
              value={tenant.lastBookingAt ? formatWarsawDate(tenant.lastBookingAt) : "brak"}
            />
          </dl>

          <div className="mt-5">
            <form action={switchTenantAction}>
              <input type="hidden" name="tenantId" value={tenant.id} />
              <button
                type="submit"
                className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
              >
                Wejdź jako ten klient →
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">Statystyki użycia</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Rez. 30d" value={tenant.bookings30d} />
            <StatTile label="Rez. ogółem" value={tenant.bookingsTotal} />
            <StatTile label="Przychód 30d" value={`${tenant.revenue30d} zł`} accent />
            <StatTile label="Klientów" value={tenant.customerCount} />
            <StatTile label="Pracowników" value={tenant.staffCount} />
            <StatTile label="Usług" value={tenant.serviceCount} />
          </div>
        </section>
      </div>

      {/* Notes */}
      <section className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
        <h2 className="mb-3 text-sm font-medium text-zinc-400">Notatki</h2>
        <TenantNotesForm tenantId={tenant.id} initialNotes={tenant.notes ?? ""} />
      </section>

      {/* Feedback from this tenant */}
      <section className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
        <h2 className="mb-3 text-sm font-medium text-zinc-400">
          Opinie od klienta
          {feedback.length > 0 && (
            <span className="ml-2 text-xs text-zinc-600">({feedback.length})</span>
          )}
        </h2>
        {feedback.length === 0 ? (
          <p className="text-sm text-zinc-600">Brak opinii.</p>
        ) : (
          <div className="space-y-3">
            {feedback.map((f) => (
              <div key={f.id} className="rounded-lg border border-zinc-800/40 bg-zinc-900/60 p-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
                    {categoryMap[f.category] ?? f.category}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 ${
                    f.status === "new" ? "bg-red-500/15 text-red-400"
                    : f.status === "read" ? "bg-amber-500/15 text-amber-400"
                    : "bg-emerald-500/15 text-emerald-400"
                  }`}>
                    {statusMap[f.status] ?? f.status}
                  </span>
                  <span className="text-zinc-600">
                    {new Date(f.created_at).toLocaleDateString("pl-PL")}
                  </span>
                </div>
                <p className="text-sm text-zinc-300">{f.message}</p>
                {f.admin_reply && (
                  <div className="mt-2 rounded-md bg-zinc-800/50 p-2">
                    <p className="text-xs text-zinc-500">Twoja odpowiedź:</p>
                    <p className="mt-0.5 text-sm text-zinc-400">{f.admin_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`text-right text-zinc-200 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800/40 bg-zinc-900/60 px-3 py-2.5">
      <p className={`text-lg font-semibold ${accent ? "text-[var(--color-accent)]" : "text-zinc-100"}`}>{value}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
