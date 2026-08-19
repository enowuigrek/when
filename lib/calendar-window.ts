import { addDays } from "@/lib/slots";

function startOfMonth(dateStr: string): string {
  return dateStr.slice(0, 7) + "-01";
}

function daysInMonth(dateStr: string): number {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * The stretch of days the panel's calendar can reach without another round
 * trip: the month either side of what is selected, which is as far as one step
 * of month navigation gets you.
 *
 * Nothing is marked closed. In a booking flow that state stops you picking a
 * day you cannot have; in the panel a closed Sunday is still worth opening —
 * there may be something on it, and you may just want to look.
 *
 * Shared by the schedule and the roster so both calendars span the same days
 * and pick up the same badges.
 */
export function calendarWindow(baseDate: string): {
  start: string;
  end: string;
  days: { date: string; closed: boolean }[];
} {
  const start = startOfMonth(addDays(startOfMonth(baseDate), -1));
  const nextMonth = addDays(startOfMonth(baseDate), daysInMonth(baseDate));
  const end = addDays(startOfMonth(nextMonth), daysInMonth(nextMonth) - 1);

  const days: { date: string; closed: boolean }[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    days.push({ date: d, closed: false });
  }
  return { start, end, days };
}
