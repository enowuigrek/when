import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getTenantIdBySlug } from "@/lib/tenant";
import { getServicesForTenant, getSettingsForTenant, getBusinessHoursForTenant } from "@/lib/db/for-tenant";
import { WidgetHeader } from "@/components/widget-header";
import { SiteFooter } from "@/components/site-footer";
import { WidgetPoweredBy } from "@/components/widget-powered-by";

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
  const openHours = hours.filter((h) => !h.closed).sort((a, b) => a.day_of_week - b.day_of_week);

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
                    {s.duration_min} min
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
          {openHours.length > 0 && (
            <div className="mt-10 rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-5 py-4">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Godziny otwarcia
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-zinc-400 sm:grid-cols-4">
                {openHours.map((h) => (
                  <div key={h.day_of_week} className="flex justify-between">
                    <span className="text-zinc-500">{DAY_SHORT[h.day_of_week]}</span>
                    <span className="font-mono">{h.open_time?.slice(0, 5)}–{h.close_time?.slice(0, 5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {isEmbed ? <WidgetPoweredBy /> : <SiteFooter />}
    </div>
  );
}
