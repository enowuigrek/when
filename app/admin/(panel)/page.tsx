import { headers } from "next/headers";
import { AdminLink } from "@/components/admin-link";
import { getDashboardStats } from "@/lib/db/stats";
import { getActiveStaff } from "@/lib/db/staff";
import { formatWarsawTime, formatWarsawDate, warsawToday } from "@/lib/slots";
import { BookingManagementButton, type BookingForModal } from "@/components/booking-management-modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageShell } from "@/components/ui/page-shell";

export const metadata = { title: "Dashboard", robots: { index: false } };

function pln(n: number) {
  return n.toLocaleString("pl-PL") + " zł";
}

/** "3 cze" from a YYYY-MM-DD. */
function shortDate(day: string) {
  return new Date(day + "T12:00:00Z").toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

const card = "rounded-xl border border-zinc-800/60 bg-zinc-900/40";
const heading = "text-xs font-medium uppercase tracking-wider text-zinc-500";

export default async function DashboardPage() {
  const [s, allStaff] = await Promise.all([getDashboardStats(), getActiveStaff()]);

  const demoSlug = (await headers()).get("x-demo-slug");
  const base = demoSlug ? `/demo/${demoSlug}` : "/admin";
  const today = warsawToday();

  // topStaff carries names, not ids — matching back gives each row a link that
  // filters the schedule to that person instead of a generic staff page.
  const staffIdByName = new Map(allStaff.map((p) => [p.name, p.id]));

  const maxCount = Math.max(...s.chartData.map((d) => d.count), 1);
  const labelEvery = Math.max(1, Math.ceil(s.chartData.length / 6));

  const now = new Date().toISOString();
  const upcoming = s.recentBookings
    .filter((b) => b.startsAt > now && b.status === "confirmed")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5);

  return (
    <PageShell title="Dashboard" subtitle={formatWarsawDate(today + "T12:00:00Z")}>
      <div className="space-y-6">

      {/* Every tile goes somewhere: the number you are looking at is usually
          the start of a question, and the answer lives one click away. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Rezerwacje dziś"
          value={String(s.todayBookings)}
          sub="zobacz harmonogram"
          href={`${base}/harmonogram?widok=dzien&od=${today}`}
        />
        <Kpi
          label="Rezerwacje w tym miesiącu"
          value={String(s.thisMonthBookings)}
          sub="potwierdzone i zakończone"
          href={`${base}/harmonogram?widok=tydzien&od=${today}`}
        />
        <Kpi
          label="Przychód w tym miesiącu"
          value={pln(s.thisMonthRevenue)}
          sub="z rezerwacji"
          href={`${base}/harmonogram?widok=tydzien&od=${today}`}
        />
        <Kpi
          label="Klienci w bazie"
          value={String(s.totalCustomers)}
          sub="przejdź do listy"
          href={`${base}/klienci`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Chart ───────────────────────────────────────────────────────── */}
        <div className={`${card} p-5 lg:col-span-2`}>
          <h2 className={heading}>Rezerwacje — ostatnie 30 dni</h2>

          {/* No items-end here: that stops the columns stretching, so a bar
              sized in percent would resolve against a parent whose height came
              from the bar itself. The columns fill the strip; justify-end
              inside each one drops the bar to the baseline. */}
          <div className="mt-5 flex gap-px" style={{ height: 130 }}>
            {s.chartData.map((d) => {
              const pct = (d.count / maxCount) * 100;
              return (
                <AdminLink
                  key={d.date}
                  href={`${base}/harmonogram?widok=dzien&od=${d.date}`}
                  className="group relative flex flex-1 flex-col justify-end"
                  aria-label={`${shortDate(d.date)}: ${d.count}`}
                >
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100 group-hover:block">
                    {shortDate(d.date)}: {d.count}
                  </span>
                  <span
                    className="w-full rounded-t-sm transition-opacity group-hover:opacity-70"
                    style={{
                      height: d.count > 0 ? `${Math.max(pct, 4)}%` : 2,
                      backgroundColor: d.count > 0 ? "var(--color-accent)" : "#52525b",
                      opacity: d.count > 0 ? 1 : 0.35,
                    }}
                  />
                </AdminLink>
              );
            })}
          </div>

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

        {/* ── What is coming ──────────────────────────────────────────────── */}
        <div className={`${card} p-5`}>
          <h2 className={heading}>Najbliższe rezerwacje</h2>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">Nic nie czeka.</p>
          ) : (
            <ul className="mt-4 space-y-1">
              {upcoming.map((b) => (
                <li key={b.id}>
                  <AdminLink
                    href={`${base}/harmonogram?widok=dzien&od=${b.startsAt.slice(0, 10)}`}
                    className="flex items-baseline gap-2.5 rounded-lg px-2 py-1.5 hover:bg-zinc-800/40"
                  >
                    <span className="shrink-0 font-mono text-xs text-[var(--color-accent)]">
                      {formatWarsawTime(b.startsAt)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-200">{b.customerName}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        {b.serviceName}
                        {b.staffName ? ` · ${b.staffName}` : ""}
                      </span>
                    </span>
                  </AdminLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Top services ────────────────────────────────────────────────── */}
        <div className={`${card} p-5`}>
          <div className="flex items-baseline justify-between">
            <h2 className={heading}>Najczęstsze usługi — 30 dni</h2>
            <AdminLink href={`${base}/uslugi`} className="text-xs text-zinc-500 hover:text-zinc-300">
              Wszystkie
            </AdminLink>
          </div>
          {s.topServices.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">Brak danych.</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {s.topServices.map((sv) => (
                <li key={sv.name} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-zinc-300">{sv.name}</span>
                  <span className="shrink-0 font-mono text-xs text-zinc-500">
                    {sv.count} · {pln(sv.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* ── Top staff ───────────────────────────────────────────────────── */}
        <div className={`${card} p-5`}>
          <div className="flex items-baseline justify-between">
            <h2 className={heading}>Najbardziej zajęci — 30 dni</h2>
            <AdminLink href={`${base}/pracownicy`} className="text-xs text-zinc-500 hover:text-zinc-300">
              Wszyscy
            </AdminLink>
          </div>
          {s.topStaff.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">Brak danych.</p>
          ) : (
            <ol className="mt-4 space-y-1">
              {s.topStaff.map((p) => {
                const id = staffIdByName.get(p.name);
                const href = id
                  ? `${base}/harmonogram?widok=tydzien&od=${today}&pracownicy=${id}`
                  : `${base}/pracownicy`;
                return (
                  <li key={p.name}>
                    <AdminLink
                      href={href}
                      className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-800/40"
                    >
                      <span className="min-w-0 truncate text-sm text-zinc-300">{p.name}</span>
                      <span className="shrink-0 font-mono text-xs text-zinc-500">{p.count} rez.</span>
                    </AdminLink>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* ── Recent activity ───────────────────────────────────────────────── */}
      <div className={`${card} p-5`}>
        <div className="flex items-baseline justify-between">
          <h2 className={heading}>Ostatnio dodane</h2>
          <AdminLink
            href={`${base}/harmonogram?widok=dzien&od=${today}`}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Harmonogram
          </AdminLink>
        </div>

        {s.recentBookings.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">Brak rezerwacji.</p>
        ) : (
          <ul className="mt-4 space-y-1">
            {s.recentBookings.slice(0, 6).map((b) => {
              const modal: BookingForModal = {
                id: b.id,
                startsAt: b.startsAt,
                endsAt: b.endsAt,
                customerName: b.customerName,
                customerPhone: b.customerPhone,
                serviceName: b.serviceName,
                staffId: b.staffId,
                staffName: b.staffName,
                staffColor: b.staffColor,
                notes: b.notes,
                status:
                  b.status === "cancelled" || b.status === "completed" || b.status === "no_show"
                    ? b.status
                    : "confirmed",
              };
              return (
                <li key={b.id}>
                  {/* Opens the same window as in the schedule — one booking,
                      one way to look at it. */}
                  <BookingManagementButton
                    booking={modal}
                    allStaff={allStaff}
                    className="flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left hover:bg-zinc-800/40"
                  >
                    <span className="shrink-0 font-mono text-xs text-zinc-500">
                      {formatWarsawDate(b.startsAt)} · {formatWarsawTime(b.startsAt)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{b.customerName}</span>
                    <span className="hidden min-w-0 flex-1 truncate text-xs text-zinc-500 sm:block">
                      {b.serviceName}
                    </span>
                    <StatusBadge status={b.status} />
                  </BookingManagementButton>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </div>
    </PageShell>
  );
}

function Kpi({ label, value, sub, href }: { label: string; value: string; sub: string; href: string }) {
  return (
    <AdminLink
      href={href}
      className={`${card} block p-4 transition-colors hover:border-zinc-700`}
    >
      <p className={heading}>{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-600">{sub}</p>
    </AdminLink>
  );
}
