/**
 * When a recurring group actually meets.
 *
 * A group is stored as "Monday, 15:45–17:15", which is a rule, not a date.
 * Everything downstream — the enrolment, the schedule, the package counter —
 * works on real instants, so the rule has to be turned into dates somewhere,
 * and this is the one place that does it.
 *
 * Occurrences are never stored. A row per meeting would have to be generated
 * ahead of time, kept in step when the hour moves, and cleaned up when the
 * group retires; the rule plus arithmetic cannot fall out of date.
 */
import { addDays, warsawDayOfWeek, warsawLocalToUtc, warsawToday } from "@/lib/slots";
import type { ClassGroup } from "@/lib/types";

export type Occurrence = {
  /** YYYY-MM-DD, Warsaw-local. */
  date: string;
  startsAtIso: string;
  endsAtIso: string;
};

/**
 * The next `count` dates this group meets, starting from `from` inclusive.
 *
 * Inclusive matters on the day itself: a Monday class that has not started yet
 * is still this week's class, and pushing it a week because the parent signed
 * up on Monday morning would be wrong.
 */
export function nextMeetingDates(
  dayOfWeek: number,
  count: number,
  from: string = warsawToday()
): string[] {
  const out: string[] = [];
  let d = from;
  // At most six steps to reach the first matching weekday, then a week apart.
  for (let i = 0; i < 7 && warsawDayOfWeek(d) !== dayOfWeek; i++) d = addDays(d, 1);
  for (let i = 0; i < count; i++) {
    out.push(d);
    d = addDays(d, 7);
  }
  return out;
}

/** A meeting's start and end as UTC instants, DST-safe. */
export function meetingInstants(
  group: Pick<ClassGroup, "start_time" | "end_time">,
  date: string
): { startsAtIso: string; endsAtIso: string } {
  const [y, m, d] = date.split("-").map(Number);
  const [sh, sm] = group.start_time.split(":").map(Number);
  const [eh, em] = group.end_time.split(":").map(Number);
  return {
    startsAtIso: warsawLocalToUtc(y, m, d, sh, sm).toISOString(),
    endsAtIso: warsawLocalToUtc(y, m, d, eh, em).toISOString(),
  };
}

export function nextMeetings(
  group: Pick<ClassGroup, "day_of_week" | "start_time" | "end_time">,
  count: number,
  from: string = warsawToday()
): Occurrence[] {
  return nextMeetingDates(group.day_of_week, count, from).map((date) => ({
    date,
    ...meetingInstants(group, date),
  }));
}

/** How long one meeting runs, in minutes. */
export function meetingMinutes(
  group: Pick<ClassGroup, "start_time" | "end_time">
): number {
  const [sh, sm] = group.start_time.split(":").map(Number);
  const [eh, em] = group.end_time.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/** "15:45–17:15" from the stored "15:45:00" pair. */
export function meetingTimeLabel(
  group: Pick<ClassGroup, "start_time" | "end_time">
): string {
  return `${group.start_time.slice(0, 5)}–${group.end_time.slice(0, 5)}`;
}

export const WEEKDAY_NAMES = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
] as const;

export const WEEKDAY_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"] as const;

/**
 * Monday first, Sunday last — how a Polish week is read, and how the studio's
 * own printed timetable is laid out.
 */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
