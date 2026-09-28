import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getTenantIdBySlug } from "@/lib/tenant";
import { getSettingsForTenant, getFeaturesForTenant } from "@/lib/db/for-tenant";
import {
  getCourseGroupsForTenant,
  getSeatCountsForTenant,
  seatsKey,
} from "@/lib/db/class-groups";
import { WidgetHeader } from "@/components/widget-header";
import { SiteFooter } from "@/components/site-footer";
import { WidgetPoweredBy } from "@/components/widget-powered-by";
import { hasFeature } from "@/lib/features";
import { meetingTimeLabel, nextMeetingDates, WEEKDAY_NAMES } from "@/lib/class-groups";
import { warsawToday, warsawDayBoundsUtc, addDays } from "@/lib/slots";
import { accentFg } from "@/lib/color-utils";
import { enrollVocabulary } from "@/lib/vocabulary";
import { classColor } from "@/lib/class-colors";
import { meetingsLabel } from "@/lib/service-label";
import { ClassEnrollPanel, type EnrollDay } from "@/components/class-enroll-panel";
import { enrollAction } from "./actions";

type Props = {
  params: Promise<{ tenantSlug: string; courseSlug: string }>;
  searchParams: Promise<{ embed?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { tenantSlug, courseSlug } = await params;
  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) return { title: "Zapisy", robots: { index: false } };
  const [groups, settings] = await Promise.all([
    getCourseGroupsForTenant(courseSlug, tenantId),
    getSettingsForTenant(tenantId),
  ]);
  const name = groups[0]?.service.name;
  return {
    title: name ? `${name} — ${settings.business_name}` : "Zapisy",
    robots: { index: false },
  };
}

/**
 * One course and the days it runs on.
 *
 * A parent is choosing a class for a child of a given age, not a Tuesday.
 * The page used to be a single weekly slot, which made them pick the day
 * before they had picked the class.
 */
export default async function CoursePage({ params, searchParams }: Props) {
  const { tenantSlug, courseSlug } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1";
  const hdrs = await headers();
  const isSubdomain = !!hdrs.get("x-tenant-subdomain");
  const basePath = isSubdomain ? "" : `/widget/${tenantSlug}`;

  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) notFound();

  const [settings, features, groups] = await Promise.all([
    getSettingsForTenant(tenantId),
    getFeaturesForTenant(tenantId),
    getCourseGroupsForTenant(courseSlug, tenantId),
  ]);
  if (!hasFeature(features, "grupy") || groups.length === 0) notFound();

  const service = groups[0].service;
  const accent = settings.color_accent ?? "#d4a26a";
  const lessons = service.total_lessons ?? 0;
  const karnet = lessons > 1 ? { lessons, pricePln: service.price_pln } : null;
  const today = warsawToday();

  // Seats on each day's next meeting, so "zbieramy grupę" is true of the day
  // the parent is about to pick rather than of the course in general.
  const nextByGroup = new Map(
    groups.map((g) => [g.id, nextMeetingDates(g.day_of_week, 1, today)[0]] as const)
  );
  const dates = [...nextByGroup.values()].sort();
  const seats = await getSeatCountsForTenant(
    groups.map((g) => g.id),
    warsawDayBoundsUtc(dates[0]).startIso,
    warsawDayBoundsUtc(addDays(dates[dates.length - 1], 1)).endIso,
    tenantId
  );

  const days: EnrollDay[] = groups.map((g) => ({
    groupId: g.id,
    dayOfWeek: g.day_of_week,
    time: meetingTimeLabel(g),
    min: g.min_participants,
    max: g.max_participants,
    taken: seats.get(seatsKey(g.id, nextByGroup.get(g.id)!)) ?? 0,
  }));

  const enquiry = service.enroll_mode === "enquiry";

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
            <Link
              href={`${basePath || "/"}${isEmbed ? "?embed=1" : ""}`}
              className="hover:text-zinc-300"
            >
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
              {service.description && (
                <p className="mt-2 text-sm text-zinc-400">{service.description}</p>
              )}
              <p className="mt-3 font-mono text-xs text-zinc-500">
                {groups
                  .map((g) => `${WEEKDAY_NAMES[g.day_of_week]} ${meetingTimeLabel(g)}`)
                  .join(" · ")}
              </p>
            </div>
            <div className="shrink-0 sm:text-right">
              <div
                className="font-mono text-xl font-semibold sm:whitespace-nowrap"
                style={{ color: accent }}
              >
                {karnet ? `${karnet.pricePln} zł` : "—"}
              </div>
              {karnet && (
                <div className="text-xs text-zinc-500 sm:whitespace-nowrap">
                  miesiąc · {meetingsLabel(karnet.lessons)}
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

          {enquiry ? (
            <div className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-5 py-4">
              <p className="text-sm text-zinc-300">
                Na te zajęcia zapisujemy po rozmowie — warunki ustalamy indywidualnie.
              </p>
              {(settings.phone || settings.email) && (
                <p className="mt-2 text-sm text-zinc-400">
                  {settings.phone && (
                    <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="font-mono">
                      {settings.phone}
                    </a>
                  )}
                  {settings.phone && settings.email && " · "}
                  {settings.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}
                </p>
              )}
            </div>
          ) : (
            <ClassEnrollPanel
              days={days}
              today={today}
              karnet={karnet}
              words={enrollVocabulary(service)}
              color={classColor(service)}
              action={enrollAction}
              hidden={{ tenantSlug }}
            />
          )}
        </section>
      </main>

      {isEmbed ? <WidgetPoweredBy /> : <SiteFooter />}
    </div>
  );
}
