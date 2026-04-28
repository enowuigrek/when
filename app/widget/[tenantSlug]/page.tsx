import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenantIdBySlug } from "@/lib/tenant";
import { getServicesForTenant, getSettingsForTenant, getBusinessHoursForTenant } from "@/lib/db/for-tenant";

type Props = { params: Promise<{ tenantSlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) return { title: "Rezerwacje" };
  const s = await getSettingsForTenant(tenantId);
  return { title: `Zarezerwuj — ${s.business_name}`, robots: { index: false } };
}

const DAY_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

export default async function WidgetHomePage({ params }: Props) {
  const { tenantSlug } = await params;
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
      className="px-4 py-6 sm:px-6"
      style={{ "--color-accent": accent, "--color-accent-hover": accent } as React.CSSProperties}
    >
      {/* Business name */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">{settings.business_name}</h1>
        {settings.tagline && <p className="mt-0.5 text-sm text-zinc-400">{settings.tagline}</p>}
      </div>

      {/* Services */}
      <div className="space-y-2.5">
        {services.length === 0 && (
          <p className="text-sm text-zinc-500">Brak dostępnych usług.</p>
        )}
        {services.map((s) => (
          <Link
            key={s.id}
            href={`/widget/${tenantSlug}/${s.slug}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3.5 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
          >
            <div className="min-w-0">
              <p className="font-medium text-zinc-100">{s.name}</p>
              {s.description && (
                <p className="mt-0.5 truncate text-xs text-zinc-500">{s.description}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="font-mono text-sm font-medium text-[var(--color-accent)]">{s.price_pln} zł</span>
              <span className="font-mono text-xs text-zinc-500">{s.duration_min} min</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Hours */}
      {openHours.length > 0 && (
        <div className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Godziny otwarcia</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
            {openHours.map((h) => (
              <div key={h.day_of_week} className="flex justify-between">
                <span>{DAY_SHORT[h.day_of_week]}</span>
                <span className="font-mono">{h.open_time?.slice(0, 5)} – {h.close_time?.slice(0, 5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Powered by */}
      <p className="mt-5 text-center text-[10px] text-zinc-700">
        Rezerwacje przez{" "}
        <a href="https://when-three.vercel.app/start" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-500">
          WHEN?
        </a>
      </p>
    </div>
  );
}
