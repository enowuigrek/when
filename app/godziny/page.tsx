import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TenantThemeWrapper } from "@/components/tenant-theme-wrapper";
import { getBusinessHours } from "@/lib/db/services";
import { getSettings } from "@/lib/db/settings";

export async function generateMetadata() {
  const s = await getSettings();
  return { title: `Godziny otwarcia — ${s.business_name}` };
}

const DAY_NAMES = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];

// "HH:MM:SS" → "HH:MM"
function formatTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

// Mon–Fri order: 1,2,3,4,5,6,0
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function HoursPage() {
  const [hours, settings] = await Promise.all([getBusinessHours(), getSettings()]);

  const sorted = DAY_ORDER.map((dow) => ({
    dow,
    name: DAY_NAMES[dow],
    data: hours.find((h) => h.day_of_week === dow),
  }));

  return (
    <TenantThemeWrapper>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--color-accent)]">
            {settings.business_name}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Godziny otwarcia</h1>

          <div className="mt-10 overflow-hidden rounded-xl border border-zinc-800/60">
            {sorted.map(({ dow, name, data }, i) => {
              const closed = !data || data.closed;
              const isLast = i === sorted.length - 1;
              return (
                <div
                  key={dow}
                  className={`flex items-center justify-between px-5 py-4 ${
                    isLast ? "" : "border-b border-zinc-800/60"
                  } ${closed ? "opacity-50" : ""}`}
                >
                  <span className="text-sm font-medium text-zinc-200">{name}</span>
                  <span className="font-mono text-sm text-zinc-400">
                    {closed
                      ? "Zamknięte"
                      : `${formatTime(data!.open_time)} – ${formatTime(data!.close_time)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </TenantThemeWrapper>
  );
}
