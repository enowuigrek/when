import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { AdminLink } from "@/components/admin-link";
import { getAdminTenantId, getAdminTenantFeatures } from "@/lib/tenant";
import { hasFeature } from "@/lib/features";
import {
  getClassGroupsForTenant,
  getSeatCountsForTenant,
  getGroupRosterForTenant,
  seatsKey,
  type RosterEntry,
} from "@/lib/db/class-groups";
import { getSettingsForTenant, getSuspendedServicesForTenant } from "@/lib/db/for-tenant";
import { nextMeetingDates } from "@/lib/class-groups";
import { warsawToday, warsawDayBoundsUtc, addDays } from "@/lib/slots";
import { enrollVocabulary, classesLabel } from "@/lib/vocabulary";
import { CourseCard, type Course, type CourseSlot } from "./course-card";
import { classColor } from "@/lib/class-colors";

export const metadata = { title: "Zajęcia", robots: { index: false } };

/**
 * The courses a studio teaches, each with the days it runs on.
 *
 * Built the other way round at first — a card per weekly slot — which turned
 * three courses into eight cards and buried the thing anybody is actually
 * choosing between. The studio's own site is organised by course; so is this.
 */
export default async function ZajeciaPage() {
  const tenantId = await getAdminTenantId();
  const features = await getAdminTenantFeatures();
  if (!hasFeature(features, "grupy")) notFound();

  const [groups, settings, suspended] = await Promise.all([
    getClassGroupsForTenant(tenantId, { includeInactive: true }),
    getSettingsForTenant(tenantId),
    getSuspendedServicesForTenant(tenantId),
  ]);
  const sectionLabel = classesLabel(settings);
  const today = warsawToday();

  if (groups.length === 0 && suspended.length === 0) {
    return (
      <PageShell title={sectionLabel} narrow>
        <p className="mt-6 text-sm text-zinc-500">
          Nie ma jeszcze żadnych zajęć. Tworzy się je w{" "}
          <AdminLink href="/admin/uslugi" className="text-zinc-300 underline underline-offset-2">
            Usługach
          </AdminLink>
          {" "}— tam ustawisz też dni i godziny.
        </p>
      </PageShell>
    );
  }

  // Seats and registers for each slot's next meeting, over whole days so a
  // booking whose hour has drifted still counts towards its class.
  const nextByGroup = new Map(
    groups.map((g) => [g.id, nextMeetingDates(g.day_of_week, 1, today)[0]] as const)
  );
  const dates = [...nextByGroup.values()].sort();
  const [seats, roster] = dates.length
    ? await Promise.all([
        getSeatCountsForTenant(
          groups.map((g) => g.id),
          warsawDayBoundsUtc(dates[0]).startIso,
          warsawDayBoundsUtc(addDays(dates[dates.length - 1], 1)).endIso,
          tenantId
        ),
        getGroupRosterForTenant(
          groups.map((g) => g.id),
          warsawDayBoundsUtc(dates[0]).startIso,
          warsawDayBoundsUtc(addDays(dates[dates.length - 1], 1)).endIso,
          tenantId
        ),
      ])
    : [new Map<string, number>(), new Map<string, RosterEntry[]>()];

  // One card per service, its slots underneath.
  const byService = new Map<string, Course>();
  for (const g of groups) {
    const lessons = g.service.total_lessons ?? 0;
    let course = byService.get(g.service_id);
    if (!course) {
      course = {
        serviceId: g.service_id,
        name: g.service.name,
        description: g.service.description,
        karnet: lessons > 1 ? { lessons, pricePln: g.service.price_pln } : null,
        enrollMode: g.service.enroll_mode === "enquiry" ? "enquiry" : "self",
        words: enrollVocabulary(g.service),
        slots: [],
        color: classColor(g.service),
      };
      byService.set(g.service_id, course);
    }
    const nextDate = nextByGroup.get(g.id)!;
    const slot: CourseSlot = {
      id: g.id,
      dayOfWeek: g.day_of_week,
      startTime: g.start_time.slice(0, 5),
      endTime: g.end_time.slice(0, 5),
      ageLabel: g.age_label,
      minParticipants: g.min_participants,
      maxParticipants: g.max_participants,
      active: g.active,
      nextDate,
      taken: seats.get(seatsKey(g.id, nextDate)) ?? 0,
      names: (roster.get(seatsKey(g.id, nextDate)) ?? []).map((r) => r.name),
    };
    course.slots.push(slot);
  }

  // A course the studio has parked still belongs here. It is on their own
  // menu and it will come back — a card that simply vanished would leave the
  // owner wondering where it went, and with no link to where its days are set.
  for (const svc of suspended) {
    if (byService.has(svc.id)) continue;
    const lessons = svc.total_lessons ?? 0;
    byService.set(svc.id, {
      serviceId: svc.id,
      name: svc.name,
      description: svc.description,
      karnet: lessons > 1 ? { lessons, pricePln: svc.price_pln } : null,
      enrollMode: svc.enroll_mode === "enquiry" ? "enquiry" : "self",
      words: enrollVocabulary(svc),
      slots: [],
      suspended: true,
      color: classColor(svc),
    });
  }

  const courses = [...byService.values()];

  return (
    <PageShell
      title={sectionLabel}
      subtitle="Kto chodzi na które zajęcia. Zapis obejmuje od razu cały miesiąc; dni i godziny zmienisz pod „Edytuj zajęcia”."
    >
      <div className="mt-8 space-y-4">
        {courses.map((c) => (
          <CourseCard key={c.serviceId} course={c} today={today} />
        ))}
      </div>
    </PageShell>
  );
}
