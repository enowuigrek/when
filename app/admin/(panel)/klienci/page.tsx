import Link from "next/link";
import { AdminLink } from "@/components/admin-link";
import { PageShell } from "@/components/ui/page-shell";
import { ListRow, ListRows, InitialAvatar } from "@/components/ui/list-row";
import { getAllCustomersWithStats } from "@/lib/db/customers";
import { formatWarsawDate } from "@/lib/slots";
import { NewCustomerDialog } from "./new-customer-dialog";

export const metadata = { title: "Klienci", robots: { index: false } };

type SearchParams = Promise<{ q?: string; sort?: string }>;

export default async function KlienciPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, sort = "updated" } = await searchParams;

  let customers = await getAllCustomersWithStats();

  if (q) {
    const lq = q.toLowerCase();
    customers = customers.filter((c) => c.name.toLowerCase().includes(lq) || c.phone.includes(q));
  }

  if (sort === "wizyty") customers = [...customers].sort((a, b) => b.visitCount - a.visitCount);
  else if (sort === "wydatki") customers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent);
  // default: updated_at (already sorted)

  return (
    <PageShell
      title="Klienci"
      subtitle={`${customers.length} klientów`}
      narrow
      actions={<NewCustomerDialog />}
    >

      <div className="mb-5 flex flex-wrap gap-3">
        <form method="get" className="flex-1">
          <input
            name="q"
            defaultValue={q}
            placeholder="Szukaj po nazwisku lub numerze…"
            className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </form>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-zinc-600">Sortuj:</span>
          {[
            { key: "updated", label: "Ostatni" },
            { key: "wizyty", label: "Wizyty" },
            { key: "wydatki", label: "Wydatki" },
          ].map(({ key, label }) => (
            <AdminLink
              key={key}
              href={`/admin/klienci?${q ? `q=${encodeURIComponent(q)}&` : ""}sort=${key}`}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${sort === key ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {label}
            </AdminLink>
          ))}
        </div>
      </div>

      {customers.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {q ? "Brak wyników." : "Brak klientów — pojawią się po pierwszej rezerwacji."}
        </p>
      ) : (
        <ListRows>
          {customers.map((c) => (
            <ListRow
              key={c.id}
              href={`/admin/klienci/${c.id}`}
              avatar={<InitialAvatar name={c.name} />}
              title={
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="truncate">{c.name}</span>
                  {c.visitCount >= 10 && (
                    <span className="rounded-full border border-[var(--color-accent)]/30 px-1.5 py-0.5 text-[10px] font-normal text-[var(--color-accent)]">
                      stały
                    </span>
                  )}
                  {c.noShowCount > 0 && (
                    <span className="text-xs font-normal text-amber-500">{c.noShowCount}× nie przyszedł</span>
                  )}
                </span>
              }
              subtitle={<span className="font-mono text-xs">{c.phone}</span>}
              right={
                <>
                  {/* Phones get the two figures that matter; the rest is desktop only. */}
                  <span className="flex flex-col items-end gap-0.5 text-right sm:hidden">
                    <span className="font-mono text-sm text-zinc-200">{c.visitCount}×</span>
                    <span className="font-mono text-[11px] text-[var(--color-accent)]">{c.totalSpent} zł</span>
                  </span>
                  <span className="hidden items-center gap-6 text-right text-xs text-zinc-500 sm:flex">
                    <span className="block">
                      <span className="block font-mono text-sm text-zinc-200">{c.visitCount}</span>
                      wizyt
                    </span>
                    <span className="block">
                      <span className="block font-mono text-sm text-[var(--color-accent)]">{c.totalSpent} zł</span>
                      wydał
                    </span>
                    {c.lastVisit && (
                      <span className="block">
                        <span className="block text-zinc-400">{formatWarsawDate(c.lastVisit)}</span>
                        ostatnia
                      </span>
                    )}
                  </span>
                  <span className="text-zinc-600">›</span>
                </>
              }
            />
          ))}
        </ListRows>
      )}
    </PageShell>
  );
}
