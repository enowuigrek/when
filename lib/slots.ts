// Slot computation in Europe/Warsaw timezone.
//
// The booking grid is generated in local Warsaw time, but persisted as UTC
// timestamps. We use Intl.DateTimeFormat to derive Warsaw wall-clock from
// instants, and assemble candidate instants by treating "YYYY-MM-DDTHH:mm"
// as Warsaw-local then resolving via the timezone offset at that moment
// (handles DST correctly for 99% of cases — a slot exactly during the spring-
// forward gap is excluded as invalid, which is fine for a barber shop).

import type { BusinessHours } from "@/lib/types";

const TZ = "Europe/Warsaw";

/**
 * Returns the UTC offset (in minutes) for Warsaw at a given UTC instant.
 * Positive = ahead of UTC.
 */
function warsawOffsetMinutes(utc: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(utc);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return Math.round((asUtc - utc.getTime()) / 60_000);
}

/**
 * Build a UTC Date from a Warsaw-local wall-clock specification.
 * Iterative because the offset itself depends on the instant (DST).
 */
function warsawLocalToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number
): Date {
  // First guess: pretend the local time is UTC.
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  // Adjust by Warsaw offset.
  let off = warsawOffsetMinutes(utc);
  utc = new Date(utc.getTime() - off * 60_000);
  // Re-check (handles DST boundary).
  off = warsawOffsetMinutes(utc);
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, 0) - off * 60_000
  );
}

/** Get day-of-week (0=Sun..6=Sat) for a Warsaw-local date string YYYY-MM-DD. */
export function warsawDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Use noon to avoid DST edge-case landing on previous day.
  const utc = warsawLocalToUtc(y, m, d, 12, 0);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  });
  const wd = dtf.format(utc);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

/** Today's date in Warsaw as YYYY-MM-DD. */
export function warsawToday(): string {
  const dtf = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dtf.format(new Date());
}

/** Add N days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

export type Slot = {
  startsAtIso: string; // UTC ISO
  endsAtIso: string;
  label: string; // "HH:MM" in Warsaw
  available?: boolean; // undefined / true = bookable; false = taken
};

/**
 * Compute available slots for a given local date.
 *
 * @param dateStr        YYYY-MM-DD (Warsaw-local)
 * @param durationMin    Service duration
 * @param hours          business_hours rows
 * @param existing       confirmed bookings overlapping the day, [start, end) UTC ISO
 * @param granularityMin slot step in minutes
 * @param staffCount     number of staff that can serve concurrently (default 1)
 */
export function computeAvailableSlots(
  dateStr: string,
  durationMin: number,
  hours: BusinessHours[],
  existing: { startsAtIso: string; endsAtIso: string }[],
  granularityMin = 15,
  staffCount = 1,
  includeUnavailable = false
): Slot[] {
  const dow = warsawDayOfWeek(dateStr);
  const todayHours = hours.find((h) => h.day_of_week === dow);
  if (!todayHours || todayHours.closed || !todayHours.open_time || !todayHours.close_time) {
    return [];
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const [openH, openM] = todayHours.open_time.split(":").map(Number);
  const [closeH, closeM] = todayHours.close_time.split(":").map(Number);
  const granularity = granularityMin;

  const dayOpenUtc = warsawLocalToUtc(y, m, d, openH, openM).getTime();
  const dayCloseUtc = warsawLocalToUtc(y, m, d, closeH, closeM).getTime();
  const now = Date.now();

  const existingRanges = existing.map((b) => ({
    s: new Date(b.startsAtIso).getTime(),
    e: new Date(b.endsAtIso).getTime(),
  }));

  const slots: Slot[] = [];
  const stepMs = granularity * 60_000;
  const durMs = durationMin * 60_000;

  for (let t = dayOpenUtc; t + durMs <= dayCloseUtc; t += stepMs) {
    if (t < now) continue; // skip past slots
    const end = t + durMs;
    const overlapCount = existingRanges.filter((r) => r.s < end && t < r.e).length;
    const available = overlapCount < staffCount;
    if (!available && !includeUnavailable) continue;

    const dtf = new Intl.DateTimeFormat("pl-PL", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    slots.push({
      startsAtIso: new Date(t).toISOString(),
      endsAtIso: new Date(end).toISOString(),
      label: dtf.format(new Date(t)),
      available,
    });
  }

  return slots;
}

/** Return UTC ISO bounds [startUtc, endUtc) for a Warsaw-local date. DST-safe. */
export function warsawDayBoundsUtc(dateStr: string): {
  startIso: string;
  endIso: string;
} {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = warsawLocalToUtc(y, m, d, 0, 0);
  const next = warsawLocalToUtc(y, m, d + 1, 0, 0);
  return { startIso: start.toISOString(), endIso: next.toISOString() };
}

/** Format a UTC ISO instant as Warsaw "HH:MM". */
export function formatWarsawTime(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Format a UTC ISO instant as Warsaw "DD MMMM YYYY". */
export function formatWarsawDate(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** Format a YYYY-MM-DD as "DD MMM" in Polish. */
export function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = warsawLocalToUtc(y, m, d, 12, 0);
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  }).format(utc);
}
