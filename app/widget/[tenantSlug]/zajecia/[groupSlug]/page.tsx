import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getTenantIdBySlug } from "@/lib/tenant";
import { getSettingsForTenant, getFeaturesForTenant } from "@/lib/db/for-tenant";
import {
  getClassGroupBySlugForTenant,
  getSeatCountsForTenant,
  seatsKey,
} from "@/lib/db/class-groups";
import { WidgetHeader } from "@/components/widget-header";
import { SiteFooter } from "@/components/site-footer";
import { WidgetPoweredBy } from "@/components/widget-powered-by";
import { hasFeature } from "@/lib/features";
import { nextMeetings, meetingTimeLabel, WEEKDAY_NAMES } from "@/lib/class-groups";
import { formatWarsawDate } from "@/lib/slots";
import { accentFg } from "@/lib/color-utils";
import { enrollVocabulary } from "@/lib/vocabulary";
import { EnrollForm } from "./enroll-form";

type Props = {
  params: Promise<{ tenantSlug: string; groupSlug: string }>;
  searchParams: Promise<{ embed?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { tenantSlug, groupSlug } = await params;
  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) return { title: "Zapisy", robots: { index: false } };
  const [group, settings] = await Promise.all([
    getClassGroupBySlugForTenant(groupSlug, tenantId),
    getSettingsForTenant(tenantId),
  ]);
  return {
    title: group ? `${group.service.name} — ${settings.business_name}` : "Zapisy",
    robots: { index: false },
  };
}

export default async function ClassGroupPage({ params, searchParams }: Props) {
  const { tenantSlug, groupSlug } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1";
  const hdrs = await headers();
  const isSubdomain = !!hdrs.get("x-tenant-subdomain");
  const basePath = isSubdomain ? "" : `/widget/${tenantSlug}`;

  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) notFound();

  const [settings, features, group] = await Promise.all([
    getSettingsForTenant(tenantId),
    getFeaturesForTenant(tenantId),
    getClassGroupBySlugForTenant(groupSlug, tenantId),
  ]);
  if (!hasFeature(features, "grupy") || !group || !group.active) notFound();

  const service = group.service;
  const accent = settings.color_accent ?? "#d4a26a";
  const lessons = service.total_lessons ?? 0;
  const karnet = lessons > 1 ? { lessons, pricePln: service.price_pln } : null;

  // The dates the sign-up will actually take. Showing them is the whole
  // difference between "zapisuję dziecko na poniedziałki" and knowing which
  // four Mondays disappear from the family calendar.
  const meetings = nextMeetings(group, Math.max(lessons, 1));
  const seats = await getSeatCountsForTenant(
    [group.id],
    meetings[0].startsAtIso,
    meetings[meetings.length - 1].endsAtIso,
    tenantId
  );
  const takenNext = seats.get(seatsKey(group.id, meetings[0].date)) ?? 0;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={
        {
          "--color-accent": accent,
          "--color-accent-hover": accent,
          "--color-accent-fg": accentFg(accent),
        } as React.CSSProperties
      }
    >
      {!isEmbed && <WidgetHeader settings={settings} tenantSlug={tenantSlug} />}

      <main className="flex-1">
        <section className={`mx-auto max-w-3xl px-6 ${isEmbed ? "py-4" : "py-12 md:py-16"}`}>
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <Link href={`${basePath || "/"}${isEmbed ? "?embed=1" : ""}`} className="hover:text-zinc-300">
              <span className="font-mono">01</span> Zajęcia
            </Link>
            <span className="text-zinc-700">→</span>
            <span className="text-zinc-200">
              <span className="font-mono text-[var(--color-accent)]">02</span> Zapis
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{service.name}</h1>
              <p className="mt-1 font-mono text-sm text-zinc-300">
                {WEEKDAY_NAMES[group.day_of_week]} · {meetingTimeLabel(group)}
              </p>
              {service.description && (
                <p className="mt-2 text-sm text-zinc-400">{service.description}</p>
              )}
              <p className="mt-3 text-xs text-zinc-500">
                <Seats
                  taken={takenNext}
                  min={group.min_participants}
                  max={group.max_participants}
                />
              </p>
            </div>
            <div className="shrink-0 sm:text-right">
              <div className="font-mono text-xl font-semibold sm:whitespace-nowrap" style={{ color: accent }}>
                {karnet ? `${karnet.pricePln} zł` : "—"}
              </div>
              {karnet && (
                <div className="text-xs text-zinc-500 sm:whitespace-nowrap">
                  miesiąc · {karnet.lessons} spotkania
                </div>
              )}
              <Link
                href={`${basePath || "/"}${isEmbed ? "?embed=1" : ""}`}
                className="mt-1 inline-block text-xs text-zinc-500 hover:text-zinc-300"
              >
                Zmień
              </Link>
            </div>
          </div>

          {karnet && (
            <div className="mt-4 rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-5 py-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Zapis obejmuje te spotkania
              </p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {meetings.map((m, i) => (
                  <li key={m.date} className="flex items-baseline gap-2 text-sm text-zinc-300">
                    <span className="font-mono text-xs text-zinc-600">
                      {i + 1}/{meetings.length}
                    </span>
                    {formatWarsawDate(m.startsAtIso)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <EnrollForm
            tenantSlug={tenantSlug}
            groupSlug={group.slug}
            karnet={karnet}
            words={enrollVocabulary(service)}
            trialLabel={
              meetings[0] ? `jedno spotkanie — ${formatWarsawDate(meetings[0].startsAtIso)}` : "jedno spotkanie"
            }
          />
        </section>
      </main>

      {isEmbed ? <WidgetPoweredBy /> : <SiteFooter />}
    </div>
  );
}

function Seats({
  taken,
  min,
  max,
}: {
  taken: number;
  min: number | null;
  max: number | null;
}) {
  if (max != null && taken >= max) return <>Brak wolnych miejsc na najbliższe spotkanie.</>;
  if (min != null && taken < min)
    return (
      <>
        Grupa się zbiera — zapisanych {taken} z {min}. Zajęcia ruszają, gdy uzbiera się
        komplet.
      </>
    );
  if (max != null) return <>Wolne miejsca: {max - taken} z {max}.</>;
  return <>Zapisanych na najbliższe spotkanie: {taken}.</>;
}
