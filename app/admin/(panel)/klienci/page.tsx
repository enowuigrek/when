import Link from "next/link";
import { getAllCustomersWithStats } from "@/lib/db/customers";
import { formatWarsawDate } from "@/lib/slots";

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
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Klienci</h1>
          <p className="mt-1 text-sm text-zinc-500">{customers.length} klientów</p>
        </div>
      </div>

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
            <Link
              key={key}
              href={`/admin/klienci?${q ? `q=${encodeURIComponent(q)}&` : ""}sort=${key}`}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${sort === key ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {customers.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {q ? "Brak wyników." : "Brak klientów — pojawią się po pierwszej rezerwacji."}
        </p>
      ) : (
        <div className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/admin/klienci/${c.id}`}
              className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-zinc-800/30"
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300">
                {c.name.charAt(0).toUpperCase()}
              </div>

              {/* Name + contact */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="font-medium text-zinc-100">{c.name}</p>
                  {c.noShowCount > 0 && (
                    <span className="text-xs text-amber-500">{c.noShowCount}× nie przyszedł</span>
                  )}
                  {c.visitCount >= 10 && (
                    <span className="rounded-full border border-[var(--color-accent)]/30 px-1.5 py-0.5 text-[10px] text-[var(--color-accent)]">stały</span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">{c.phone}</p>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-6 text-right text-xs text-zinc-500">
                <div>
                  <p className="font-mono text-sm text-zinc-200">{c.visitCount}</p>
                  <p>wizyt</p>
                </div>
                <div>
                  <p className="font-mono text-sm text-[var(--color-accent)]">{c.totalSpent} zł</p>
                  <p>wydał</p>
                </div>
                {c.lastVisit && (
                  <div>
                    <p className="text-zinc-400">{formatWarsawDate(c.lastVisit)}</p>
                    <p>ostatnia</p>
                  </div>
                )}
              </div>

              <span className="text-zinc-600">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
