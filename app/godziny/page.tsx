import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TenantThemeWrapper } from "@/components/tenant-theme-wrapper";
import { getMainBusinessHours, getMainSettings } from "@/lib/db/main-tenant";
import { WEEKDAY_NAMES, WEEK_ORDER } from "@/lib/weekdays";

export async function generateMetadata() {
  const s = await getMainSettings();
  return { title: `Godziny otwarcia — ${s.business_name}` };
}

// "HH:MM:SS" → "HH:MM"
function formatTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}


export default async function HoursPage() {
  const [hours, settings] = await Promise.all([getMainBusinessHours(), getMainSettings()]);

  const sorted = WEEK_ORDER.map((dow) => ({
    dow,
    name: WEEKDAY_NAMES[dow],
    data: hours.find((h) => h.day_of_week === dow),
  }));

  return (
    <TenantThemeWrapper settings={settings}>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-16 md:py-24">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--color-accent)]">
            {settings.business_name}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Godziny otwarcia</h1>

          <div className="mt-8 overflow-hidden rounded-xl border border-zinc-800/60 sm:mt-10">
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
