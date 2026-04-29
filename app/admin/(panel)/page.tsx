import Link from "next/link";
import { getDashboardStats } from "@/lib/db/stats";
import { formatWarsawTime, formatWarsawDate } from "@/lib/slots";

export const metadata = { title: "Dashboard", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  confirmed: "potwierdzona",
  completed: "zakończona",
  cancelled: "anulowana",
  no_show: "no-show",
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: "text-emerald-400",
  completed: "text-zinc-400",
  cancelled: "text-red-400",
  no_show: "text-amber-400",
};

function formatPln(n: number) {
  return n.toLocaleString("pl-PL") + " zł";
}

/** Short "DD MMM" label, e.g. "3 cze" */
function shortDate(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  const s = await getDashboardStats();

  const maxChart = Math.max(...s.chartData.map((d) => d.count), 1);

  // Show ~every 5th label to avoid crowding
  const labelEvery = Math.ceil(s.chartData.length / 6);

  return (
    <section className="mx-auto max-w-6xl px-6 py-10 space-y-8">

      {/* ── KPI tiles ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Rezerwacje — ten miesiąc"
          value={String(s.thisMonthBookings)}
          sub="potwierdzonych i zakończonych"
          href="/admin/harmonogram?widok=miesiac"
        />
        <KpiCard
          label="Przychód — ten miesiąc"
          value={formatPln(s.thisMonthRevenue)}
          sub="suma z rezerwacji"
          href="/admin/harmonogram?widok=miesiac"
        />
        <KpiCard
          label="Klienci łącznie"
          value={String(s.totalCustomers)}
          sub="w bazie"
          href="/admin/klienci"
        />
        <KpiCard
          label="Rezerwacje dziś"
          value={String(s.todayBookings)}
          sub="potwierdzonych"
          href="/admin/harmonogram"
        />
      </div>

      {/* ── Chart ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <h2 className="mb-5 text-sm font-medium uppercase tracking-wider text-zinc-400">
          Rezerwacje — ostatnie 30 dni
        </h2>

        <div className="flex items-end gap-px" style={{ height: 120 }}>
          {s.chartData.map((d, i) => {
            const pct = maxChart > 0 ? (d.count / maxChart) * 100 : 0;
            return (
              <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full mb-1.5 hidden -translate-x-1/2 left-1/2 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100 whitespace-nowrap group-hover:block z-10">
                  {shortDate(d.date)}: {d.count}
                </div>
                {/* Bar */}
                <div
                  className="w-full rounded-t-sm transition-opacity group-hover:opacity-80"
                  style={{
                    height: pct > 0 ? `${Math.max(pct, 3)}%` : "2px",
                    backgroundColor: pct > 0 ? "var(--color-accent)" : "var(--tw-color, #3f3f46)",
                    opacity: pct > 0 ? 1 : 0.3,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="mt-2 flex gap-px">
          {s.chartData.map((d, i) => (
            <div key={d.date} className="flex-1 text-center">
              {i % labelEvery === 0 && (
                <span className="text-[10px] text-zinc-600">{shortDate(d.date)}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Top services + Top staff ──────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Top services */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">
            Top usługi — ten miesiąc
          </h2>
          {s.topServices.length === 0 ? (
            <p className="text-sm text-zinc-600">Brak danych.</p>
          ) : (
            <ol className="space-y-2">
              {s.topServices.map((svc, i) => {
                const barPct = s.topServices[0]
                  ? Math.round((svc.count / s.topServices[0].count) * 100)
                  : 0;
                return (
                  <li key={svc.name}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex items-baseline gap-2 min-w-0">
                        <span className="shrink-0 font-mono text-xs text-zinc-600">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate text-zinc-200">{svc.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-zinc-400">
                        {svc.count}×
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-zinc-800">
                      <div
                        className="h-1 rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <Link
            href="/admin/uslugi"
            className="mt-4 inline-block text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Zarządzaj usługami →
          </Link>
        </div>

        {/* Top staff */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">
            Top pracownicy — ten miesiąc
          </h2>
          {s.topStaff.length === 0 ? (
            <p className="text-sm text-zinc-600">Brak danych lub brak przypisanych pracowników.</p>
          ) : (
            <ol className="space-y-2">
              {s.topStaff.map((st, i) => {
                const barPct = s.topStaff[0]
                  ? Math.round((st.count / s.topStaff[0].count) * 100)
                  : 0;
                return (
                  <li key={st.name}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex items-baseline gap-2 min-w-0">
                        <span className="shrink-0 font-mono text-xs text-zinc-600">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate text-zinc-200">{st.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-zinc-400">
                        {st.count} rez.
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-zinc-800">
                      <div
                        className="h-1 rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <Link
            href="/admin/pracownicy"
            className="mt-4 inline-block text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Zarządzaj pracownikami →
          </Link>
        </div>
      </div>

      {/* ── Recent bookings ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
            Ostatnie rezerwacje
          </h2>
          <Link
            href="/admin/harmonogram"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Pełny harmonogram →
          </Link>
        </div>

        {s.recentBookings.length === 0 ? (
          <p className="text-sm text-zinc-600">Brak rezerwacji.</p>
        ) : (
          <div className="space-y-2">
            {s.recentBookings.map((b) => {
              // ISO date YYYY-MM-DD for harmonogram day-view link.
              // Slice the UTC ISO; for normal daytime bookings this matches
              // the Warsaw date. Edge cases (midnight bookings) might be off
              // by a day — acceptable for navigation.
              const dayIso = b.startsAt.slice(0, 10);
              return (
                <Link
                  key={b.id}
                  href={`/admin/harmonogram?widok=dzien&od=${dayIso}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
                >
                  <span className="min-w-0 flex-1 font-medium text-zinc-200 truncate">
                    {b.customerName}
                  </span>
                  <span className="text-sm text-zinc-400 truncate">{b.serviceName}</span>
                  {b.staffName && (
                    <span className="text-xs text-zinc-600">· {b.staffName}</span>
                  )}
                  <span className="font-mono text-xs text-zinc-500 ml-auto">
                    {formatWarsawDate(b.startsAt)}, {formatWarsawTime(b.startsAt)}
                  </span>
                  <span className={`text-xs font-medium ${STATUS_COLOR[b.status] ?? "text-zinc-500"}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                  {b.pricePln != null && (
                    <span className="font-mono text-xs text-zinc-500">{b.pricePln} zł</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
}

function KpiCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 h-full">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{sub}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}
