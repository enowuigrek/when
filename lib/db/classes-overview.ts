import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClassGroupsForTenant } from "@/lib/db/class-groups";
import { nextMeetingDates, meetingTimeLabel } from "@/lib/class-groups";
import { warsawToday, warsawDayOfWeek, warsawDayBoundsUtc, addDays } from "@/lib/slots";

export type TodayClass = {
  groupId: string;
  time: string;
  name: string;
  taken: number;
  min: number | null;
  names: string[];
};

export type FillingGroup = {
  groupId: string;
  dayOfWeek: number;
  time: string;
  name: string;
  taken: number;
  min: number;
  nextDate: string;
};

export type RunningOut = {
  customerId: string;
  childName: string;
  courseName: string;
  /** Last meeting already booked. */
  lastDate: string;
  booked: number;
  total: number;
};

export type ClassesOverview = {
  today: TodayClass[];
  filling: FillingGroup[];
  runningOut: RunningOut[];
  childrenCount: number;
};

/**
 * What a studio needs to see first thing.
 *
 * A salon's dashboard answers "how busy am I"; a studio's answers three other
 * questions — who is coming today, which groups still have not gathered, and
 * whose month is about to run out. The last one only exists because a month
 * here is four meetings and nothing renews itself: without the list, a child
 * quietly stops appearing in the schedule and nobody notices until the room
 * is half empty.
 */
export async function getClassesOverviewForTenant(tenantId: string): Promise<ClassesOverview> {
  const supabase = createAdminClient();
  const today = warsawToday();
  const groups = await getClassGroupsForTenant(tenantId);

  const empty: ClassesOverview = { today: [], filling: [], runningOut: [], childrenCount: 0 };
  if (groups.length === 0) return empty;

  // Everything the groups touch between today and their next meeting.
  const nextByGroup = new Map(
    groups.map((g) => [g.id, nextMeetingDates(g.day_of_week, 1, today)[0]] as const)
  );
  const lastDate = [...nextByGroup.values()].sort().at(-1)!;

  const { data: rows } = await supabase
    .from("bookings")
    .select("class_group_id, starts_at, customer_name, status")
    .eq("tenant_id", tenantId)
    .in("class_group_id", groups.map((g) => g.id))
    .neq("status", "cancelled")
    .gte("starts_at", warsawDayBoundsUtc(today).startIso)
    .lt("starts_at", warsawDayBoundsUtc(addDays(lastDate, 1)).endIso);

  const dayIn = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const roster = new Map<string, string[]>();
  for (const r of rows ?? []) {
    const key = `${r.class_group_id as string}|${dayIn.format(new Date(r.starts_at as string))}`;
    const list = roster.get(key) ?? [];
    list.push(r.customer_name as string);
    roster.set(key, list);
  }

  const todayDow = warsawDayOfWeek(today);
  const todayClasses: TodayClass[] = groups
    .filter((g) => g.day_of_week === todayDow)
    .map((g) => {
      const names = roster.get(`${g.id}|${today}`) ?? [];
      return {
        groupId: g.id,
        time: meetingTimeLabel(g),
        name: g.age_label ?? g.service.name,
        taken: names.length,
        min: g.min_participants,
        names,
      };
    });

  const filling: FillingGroup[] = groups
    .filter((g) => g.min_participants != null)
    .map((g) => {
      const date = nextByGroup.get(g.id)!;
      return {
        groupId: g.id,
        dayOfWeek: g.day_of_week,
        time: meetingTimeLabel(g),
        name: g.age_label ?? g.service.name,
        taken: (roster.get(`${g.id}|${date}`) ?? []).length,
        min: g.min_participants!,
        nextDate: date,
      };
    })
    .filter((g) => g.taken < g.min)
    .sort((a, b) => b.min - b.taken - (a.min - a.taken));

  // Months about to run out. A package is a month; when its last booked
  // meeting is inside a fortnight, somebody has to sign the child up again.
  const horizon = addDays(today, 14);
  const { data: packs } = await supabase
    .from("service_packages")
    .select("id, total_lessons, customer_id, service:services(name), customer:customers(name)")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  const runningOut: RunningOut[] = [];
  if (packs && packs.length > 0) {
    const { data: packBookings } = await supabase
      .from("bookings")
      .select("package_id, starts_at")
      .eq("tenant_id", tenantId)
      .in("package_id", packs.map((p) => p.id as string))
      .neq("status", "cancelled");

    const byPackage = new Map<string, string[]>();
    for (const b of packBookings ?? []) {
      const list = byPackage.get(b.package_id as string) ?? [];
      list.push(b.starts_at as string);
      byPackage.set(b.package_id as string, list);
    }

    for (const p of packs) {
      const dates = (byPackage.get(p.id as string) ?? []).sort();
      if (dates.length === 0) continue;
      const last = dayIn.format(new Date(dates.at(-1)!));
      if (last > horizon) continue;
      // The client types an embedded one-to-one relation as an array.
      const svc = (Array.isArray(p.service) ? p.service[0] : p.service) as
        | { name: string }
        | null;
      const cust = (Array.isArray(p.customer) ? p.customer[0] : p.customer) as
        | { name: string }
        | null;
      runningOut.push({
        customerId: p.customer_id as string,
        childName: cust?.name ?? "—",
        courseName: svc?.name ?? "—",
        lastDate: last,
        booked: dates.length,
        total: (p.total_lessons as number) ?? dates.length,
      });
    }
    runningOut.sort((a, b) => a.lastDate.localeCompare(b.lastDate));
  }

  const { count } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .not("guardian_id", "is", null);

  return { today: todayClasses, filling, runningOut, childrenCount: count ?? 0 };
}
