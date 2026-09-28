import { getServices, getBusinessHours } from "@/lib/db/services";
import { getSettings, getTimeFilters } from "@/lib/db/settings";
import { getBookingsInRange } from "@/lib/db/bookings";
import { computeAvailableSlots, warsawToday, addDays, warsawDayOfWeek } from "@/lib/slots";
import { getAllStaff } from "@/lib/db/staff";
import { AdminBookingForm } from "./admin-booking-form";
import { ClassEntry, type EntryClass } from "./class-entry";
import { PageShell } from "@/components/ui/page-shell";
import { getAdminTenantFeatures, getAdminTenantId, getAdminBasePath } from "@/lib/tenant";
import { hasFeature } from "@/lib/features";
import { newEntryLabel, enrollVocabulary } from "@/lib/vocabulary";
import { getClassGroupsForTenant } from "@/lib/db/class-groups";
import { classColor } from "@/lib/class-colors";

export async function generateMetadata() {
  const runsGroups = hasFeature(await getAdminTenantFeatures(), "grupy");
  return { title: newEntryLabel(runsGroups).title, robots: { index: false } };
}

export default async function AdminNewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    godzina?: string;
    phone?: string;
    name?: string;
    email?: string;
    tryb?: string;
  }>;
}) {
  const { data: dataParam, godzina: godzinaParam, phone, name, email, tryb } = await searchParams;

  const [allServices, hours, settings, timeFilters, allStaff, features] = await Promise.all([
    getServices(),
    getBusinessHours(),
    getSettings(),
    getTimeFilters(),
    getAllStaff(),
    getAdminTenantFeatures(),
  ]);
  const runsGroups = hasFeature(features, "grupy");
  const words = newEntryLabel(runsGroups);
  const today = warsawToday();

  // A tenant that runs classes signs children up to them here. Classes are
  // kept out of the appointment form either way: offered there they were a
  // calendar of opening hours and then "no free slots" for a Monday the class
  // plainly runs on.
  const groups = runsGroups ? await getClassGroupsForTenant(await getAdminTenantId()) : [];
  const classIds = new Set(groups.map((g) => g.service_id));
  const services = allServices.filter((s) => !classIds.has(s.id));

  if (runsGroups && tryb !== "rezerwacja") {
    const byService = new Map<string, EntryClass>();
    for (const g of groups) {
      let c = byService.get(g.service_id);
      if (!c) {
        const lessons = g.service.total_lessons ?? 0;
        c = {
          serviceId: g.service_id,
          name: g.service.name,
          description: g.service.description,
          color: classColor(g.service),
          pricePln: g.service.price_pln,
          karnet: lessons > 1 ? { lessons, pricePln: g.service.price_pln } : null,
          enquiry: g.service.enroll_mode === "enquiry",
          words: enrollVocabulary(g.service),
          slots: [],
        };
        byService.set(g.service_id, c);
      }
      c.slots.push({
        groupId: g.id,
        dayOfWeek: g.day_of_week,
        startTime: g.start_time.slice(0, 5),
        endTime: g.end_time.slice(0, 5),
        ageLabel: g.age_label,
      });
    }
    // The order the studio lists its courses in, not the order of the week.
    const classes = [...byService.values()].sort(
      (a, b) =>
        (groups.find((g) => g.service_id === a.serviceId)?.service.sort_order ?? 0) -
        (groups.find((g) => g.service_id === b.serviceId)?.service.sort_order ?? 0)
    );

    return (
      <PageShell narrow title={words.title} subtitle="Zapis na zajęcia przez telefon lub przy ladzie.">
        <ClassEntry
          classes={classes}
          today={today}
          bookingHref={
            services.length > 0 ? `${await getAdminBasePath()}/rezerwacja/nowa?tryb=rezerwacja` : null
          }
        />
      </PageShell>
    );
  }

  const activeStaff = allStaff.filter((s) => s.active);
  const staffCount = Math.max(1, activeStaff.length);
  const firstService = services[0] ?? null;

  const days = Array.from({ length: settings.booking_horizon_days }, (_, i) => {
    const date = addDays(today, i);
    const dow = warsawDayOfWeek(date);
    const dayHours = hours.find((h) => h.day_of_week === dow);
    return { date, closed: !dayHours || dayHours.closed };
  });

  const prefilledDate = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? dataParam : null;
  const initialDate = prefilledDate ?? days.find((d) => !d.closed)?.date ?? today;

  let initialSlots: ReturnType<typeof computeAvailableSlots> = [];
  if (firstService) {
    const dayStartUtc = new Date(`${initialDate}T00:00:00Z`).toISOString();
    const dayEndUtc = new Date(`${addDays(initialDate, 1)}T00:00:00Z`).toISOString();
    const existing = await getBookingsInRange(dayStartUtc, dayEndUtc);
    initialSlots = computeAvailableSlots(
      initialDate,
      firstService.duration_min,
      hours,
      existing,
      settings.slot_granularity_min,
      staffCount
    );
  }

  return (
    <PageShell
      narrow
      title={runsGroups ? "Nowa rezerwacja" : words.title}
      subtitle={runsGroups ? "Termin na usługę, która nie jest zajęciami." : words.subtitle}
    >
      <AdminBookingForm
        services={services}
        staff={activeStaff}
        days={days}
        initialDate={initialDate}
        initialSlots={initialSlots}
        timeFilters={timeFilters}
        granularityMin={settings.slot_granularity_min}
        today={today}
        prefilledTime={godzinaParam ?? null}
        prefilledPhone={phone ?? null}
        prefilledName={name ?? null}
        prefilledEmail={email ?? null}
      />
    </PageShell>
  );
}
