import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getTenantIdBySlug } from "@/lib/tenant";
import { getServicesForTenant, getSettingsForTenant, getBusinessHoursForTenant } from "@/lib/db/for-tenant";
import { WidgetHeader } from "@/components/widget-header";
import { SiteFooter } from "@/components/site-footer";
import { WidgetPoweredBy } from "@/components/widget-powered-by";
import { serviceMeta } from "@/lib/service-label";

type Props = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ embed?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) return { title: "Rezerwacje", robots: { index: false } };
  const s = await getSettingsForTenant(tenantId);
  return {
    title: `Zarezerwuj — ${s.business_name}`,
    description: "Zarezerwuj wizytę online — szybko, bez logowania.",
    robots: { index: false },
    openGraph: {
      title: `Zarezerwuj — ${s.business_name}`,
      description: "Zarezerwuj wizytę online — szybko, bez logowania.",
      type: "website",
    },
  };
}

const DAY_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

export default async function WidgetHomePage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1";
  // When served via subdomain (*.whenbooking.pl), middleware sets this header
  // so we generate short paths (e.g. "/{slug}") instead of "/widget/{tenant}/{slug}"
  const hdrs = await headers();
  const isSubdomain = !!hdrs.get("x-tenant-subdomain");
  const basePath = isSubdomain ? "" : `/widget/${tenantSlug}`;

  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) notFound();

  const [services, settings, hours] = await Promise.all([
    getServicesForTenant(tenantId),
    getSettingsForTenant(tenantId),
    getBusinessHoursForTenant(tenantId),
  ]);

  const accent = settings.color_accent ?? "#d4a26a";
  // All 7 days, Mon–Sun order (dow 1–6, then 0)
  const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0];
  const hoursMap = new Map(hours.map((h) => [h.day_of_week, h]));
  const allHours = ALL_DAYS.map((dow) => hoursMap.get(dow) ?? { day_of_week: dow, closed: true, open_time: null, close_time: null });

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ "--color-accent": accent, "--color-accent-hover": accent } as React.CSSProperties}
    >
      {!isEmbed && <WidgetHeader settings={settings} tenantSlug={tenantSlug} />}

      <main className="flex-1">
        <section className={`mx-auto max-w-3xl px-6 ${isEmbed ? "py-4" : "py-12 md:py-16"}`}>
          {/* Stepper — first step active */}
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <span className="text-zinc-200">
              <span className="font-mono text-[var(--color-accent)]">01</span> Usługa
            </span>
            <span className="text-zinc-700">→</span>
            <span>Termin</span>
            <span className="text-zinc-700">→</span>
            <span>Dane</span>
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
            Czego potrzebujesz?
          </h1>
          {settings.tagline && (
            <p className="mt-3 text-zinc-400">{settings.tagline}</p>
          )}

          {/* Services */}
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {services.length === 0 && (
              <p className="text-sm text-zinc-500">Brak dostępnych usług.</p>
            )}
            {services.map((s) => (
              <Link
                key={s.id}
                href={`${basePath}/${s.slug}${isEmbed ? "?embed=1" : ""}`}
                className="group flex items-start justify-between gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4 transition-all hover:border-[var(--color-accent)]/40 hover:bg-zinc-900/70 active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-100">{s.name}</p>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{s.description}</p>
                  )}
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                    {serviceMeta(s)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="font-mono text-base font-semibold" style={{ color: accent }}>
                    {s.price_pln} zł
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Hours */}
          {hours.length > 0 && (
            <div className="mt-10 rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-5 py-4">
              <p className="mb-4 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Godziny otwarcia
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                {/* Weekdays: Mon–Fri (dow 1–5) */}
                <div className="space-y-2">
                  {allHours.filter((h) => h.day_of_week >= 1 && h.day_of_week <= 5).map((h) => (
                    <div key={h.day_of_week} className="flex items-center justify-between gap-3 text-sm">
                      <span className="w-5 shrink-0 text-zinc-400 font-medium">{DAY_SHORT[h.day_of_week]}</span>
                      {h.closed
                        ? <span className="font-mono text-xs text-zinc-600 line-through">nieczynne</span>
                        : <span className="font-mono text-sm text-zinc-300">{h.open_time?.slice(0, 5)}–{h.close_time?.slice(0, 5)}</span>
                      }
                    </div>
                  ))}
                </div>
                {/* Weekend: Sat (6) + Sun (0) */}
                <div className="space-y-2">
                  {allHours.filter((h) => h.day_of_week === 6 || h.day_of_week === 0).map((h) => (
                    <div key={h.day_of_week} className="flex items-center justify-between gap-3 text-sm">
                      <span className="w-5 shrink-0 text-zinc-400 font-medium">{DAY_SHORT[h.day_of_week]}</span>
                      {h.closed
                        ? <span className="font-mono text-xs text-zinc-600 line-through">nieczynne</span>
                        : <span className="font-mono text-sm text-zinc-300">{h.open_time?.slice(0, 5)}–{h.close_time?.slice(0, 5)}</span>
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {isEmbed ? <WidgetPoweredBy /> : <SiteFooter />}
    </div>
  );
}
