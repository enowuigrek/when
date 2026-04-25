import { getAllCustomers } from "@/lib/db/customers";

export const metadata = { title: "Klienci", robots: { index: false } };

type SearchParams = Promise<{ q?: string }>;

export default async function KlienciPage({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const all = await getAllCustomers();

  const customers = q
    ? all.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.phone.includes(q)
      )
    : all;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Klienci</h1>
          <p className="mt-1 text-sm text-zinc-500">{all.length} zarejestrowanych</p>
        </div>
      </div>

      <form method="get" className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj po nazwisku lub numerze…"
          className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </form>

      {customers.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {q ? "Brak wyników." : "Brak klientów — pojawią się po pierwszej rezerwacji."}
        </p>
      ) : (
        <div className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-100">{c.name}</p>
                {c.email && (
                  <p className="mt-0.5 text-xs text-zinc-500">{c.email}</p>
                )}
              </div>
              <a
                href={`tel:${c.phone}`}
                className="shrink-0 font-mono text-sm text-zinc-400 hover:text-[var(--color-accent)]"
              >
                {c.phone}
              </a>
              <span className="shrink-0 text-xs text-zinc-600">
                {new Date(c.updated_at).toLocaleDateString("pl-PL")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
