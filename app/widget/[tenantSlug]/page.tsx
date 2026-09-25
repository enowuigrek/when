import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getTenantIdBySlug } from "@/lib/tenant";
import {
  getServicesForTenant,
  getSuspendedServicesForTenant,
  getSettingsForTenant,
  getBusinessHoursForTenant,
  getFeaturesForTenant,
} from "@/lib/db/for-tenant";
import { getClassGroupsForTenant, getSeatCountsForTenant } from "@/lib/db/class-groups";
import { ClassWeekGrid } from "@/components/class-week-grid";
import { hasFeature } from "@/lib/features";
import { nextMeetingDates, meetingInstants } from "@/lib/class-groups";
import { WidgetHeader } from "@/components/widget-header";
import { SiteFooter } from "@/components/site-footer";
import { WidgetPoweredBy } from "@/components/widget-powered-by";
import { serviceMeta, priceLabel } from "@/lib/service-label";

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

  const [allServices, settings, hours, features] = await Promise.all([
    getServicesForTenant(tenantId),
    getSettingsForTenant(tenantId),
    getBusinessHoursForTenant(tenantId),
    getFeaturesForTenant(tenantId),
  ]);

  // Recurring groups are a different product from a bookable slot, so they get
  // their own box rather than a row among the services. A tenant without the
  // capability pays for none of this.
  const runsGroups = hasFeature(features, "grupy");
  const groups = runsGroups ? await getClassGroupsForTenant(tenantId) : [];
  const suspended = runsGroups ? await getSuspendedServicesForTenant(tenantId) : [];

  // Seats on each group's next meeting. One window covers them all: every
  // group meets once a week, so eight days holds exactly one of each.
  let seats = new Map<string, number>();
  if (groups.length > 0) {
    const horizon = groups.map((g) => {
      const [date] = nextMeetingDates(g.day_of_week, 1);
      return meetingInstants(g, date);
    });
    const from = horizon.reduce((a, b) => (a < b.startsAtIso ? a : b.startsAtIso), horizon[0].startsAtIso);
    const to = horizon.reduce((a, b) => (a > b.endsAtIso ? a : b.endsAtIso), horizon[0].endsAtIso);
    seats = await getSeatCountsForTenant(groups.map((g) => g.id), from, to, tenantId);
  }

  // A course that runs as a group is booked through the grid, not as a slot —
  // showing it in both places would offer the same thing two different ways.
  const groupServiceIds = new Set(groups.map((g) => g.service_id));
  const services = allServices.filter((s) => !groupServiceIds.has(s.id));

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
        {/* A timetable needs more than a reading column: at max-w-3xl four open
            days wrap to three and one, which is what made the grid look
            broken. Pages without groups keep the narrower measure. */}
        <section
          className={`mx-auto px-6 ${groups.length > 0 ? "max-w-5xl" : "max-w-3xl"} ${
            isEmbed ? "py-4" : "py-12 md:py-16"
          }`}
        >
          {/* Stepper — first step active. Hidden when the page also offers
              groups: enrolment is two steps, not three, so the strip would be
              describing only half of what is on screen. */}
          <div className={`mb-2 flex items-center gap-2 text-sm text-zinc-500 ${groups.length > 0 ? "hidden" : ""}`}>
            <span className="text-zinc-200">
              <span className="font-mono text-[var(--color-accent)]">01</span> Usługa
            </span>
            <span className="text-zinc-700">→</span>
            <span>Termin</span>
            <span className="text-zinc-700">→</span>
            <span>Dane</span>
          </div>

          {/* "Czego potrzebujesz?" is the right question at a counter and the
              wrong one over a timetable — a parent signing a child up for
              Monday classes is not shopping. Where there are groups the
              timetable is the page, so it carries the heading itself. */}
          {groups.length === 0 && (
            <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
              Czego potrzebujesz?
            </h1>
          )}
          {groups.length === 0 && settings.tagline && (
            <p className="mt-3 text-zinc-400">{settings.tagline}</p>
          )}

          {/* Zajęcia — the weekly grid */}
          {groups.length > 0 && (
            <section className="mt-8">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Zajęcia — zapisy
              </h1>
              <p className="mt-2 mb-6 text-sm text-zinc-400">
                {settings.tagline ??
                  "Wybierz dzień i grupę. Zapis rezerwuje miejsce na najbliższe spotkania."}
              </p>
              <ClassWeekGrid
                groups={groups}
                seats={seats}
                hrefFor={(g) => `${basePath}/zajecia/${g.slug}${isEmbed ? "?embed=1" : ""}`}
              />
              {suspended.length > 0 && (
                <div className="mt-4 rounded-xl border border-zinc-800/40 bg-zinc-900/10 px-5 py-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Chwilowo zawieszone
                  </p>
                  <ul className="mt-2 space-y-1">
                    {suspended.map((s) => (
                      <li key={s.id} className="text-sm text-zinc-500">
                        {s.name}
                        {s.description && (
                          <span className="text-zinc-600"> — {s.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Services */}
          {groups.length > 0 && services.length > 0 && (
            <h2 className="mt-12 mb-1 text-lg font-semibold tracking-tight text-zinc-100">
              Rezerwacja terminu
            </h2>
          )}
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {services.length === 0 && groups.length === 0 && (
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
                    {priceLabel(s)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Hours. Hidden where the week grid is on screen: for a studio the
              grid is the opening hours, and a second box saying the place is
              shut on Monday while Monday's class sits above it reads as a bug. */}
          {groups.length === 0 && hours.length > 0 && (
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
