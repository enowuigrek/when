import Link from "next/link";
import { getBookingsBetween } from "@/lib/db/bookings";
import { getActiveStaff } from "@/lib/db/staff";
import { getBusinessHours, getServices } from "@/lib/db/services";
import { CalendarPicker } from "@/components/calendar-picker";
import { StaffFilterBar, type StaffFilterChip } from "@/components/staff-filter-bar";
import { DayTimeline } from "./day-timeline";
import {
  warsawToday,
  addDays,
  warsawDayBoundsUtc,
  warsawDayOfWeek,
  formatShortDate,
} from "@/lib/slots";
import { dayLabels } from "@/lib/business";

export const metadata = { title: "Harmonogram", robots: { index: false } };

/** Warsaw-local YYYY-MM-DD for an UTC instant. */
function warsawDate(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
}

export default async function HarmonogramPage({
  searchParams,
}: {
  searchParams: Promise<{ od?: string; pracownik?: string }>;
}) {
  const { od, pracownik } = await searchParams;
  const today = warsawToday();
  const baseDate = od && /^\d{4}-\d{2}-\d{2}$/.test(od) ? od : today;

  const startIso = warsawDayBoundsUtc(baseDate).startIso;
  const endIso = warsawDayBoundsUtc(baseDate).endIso;

  // Fetch all in parallel
  const [allStaff, hours, all, allServicesRaw] = await Promise.all([
    getActiveStaff(),
    getBusinessHours(),
    getBookingsBetween(startIso, endIso),
    getServices(),
  ]);
  const allServices = allServicesRaw.map((s) => ({
    id: s.id, name: s.name, duration_min: s.duration_min, price_pln: s.price_pln,
  }));

  const selectedStaffId = pracownik && allStaff.some((s) => s.id === pracownik) ? pracownik : null;
  const visibleStaff = selectedStaffId ? allStaff.filter((s) => s.id === selectedStaffId) : allStaff;

  const activeAll = all.filter((b) => b.status !== "cancelled" && b.status !== "no_show");
  const active = selectedStaffId ? activeAll.filter((b) => b.staff_id === selectedStaffId) : activeAll;

  // Business hours for THIS day
  const dow = warsawDayOfWeek(baseDate);
  const dayHours = hours.find((h) => h.day_of_week === dow);
  const businessOpen = dayHours?.open_time?.slice(0, 5) ?? null;
  const businessClose = dayHours?.close_time?.slice(0, 5) ?? null;
  const closed = dayHours?.closed ?? false;

  // ── Navigation helpers ─────────────────────────────────────────────────────
  function navUrl(date: string, staffOverride?: string | null) {
    const params = new URLSearchParams({ od: date });
    const sid = staffOverride === undefined ? selectedStaffId : staffOverride;
    if (sid) params.set("pracownik", sid);
    return `/admin/harmonogram?${params.toString()}`;
  }
  const prevDate = addDays(baseDate, -1);
  const nextDate = addDays(baseDate, 1);

  // Calendar: every day in a wide range is clickable. The hrefMap covers a
  // year on either side of today + the viewed date — generous enough that the
  // user can navigate freely without us needing to recompute server-side.
  const calendarDays: { date: string; closed: boolean }[] = [];
  const hrefMap: Record<string, string> = {};
  const calStart = addDays(today, -365);
  for (let i = 0; i < 365 * 2 + 1; i++) {
    const d = addDays(calStart, i);
    calendarDays.push({ date: d, closed: false });
    hrefMap[d] = navUrl(d);
  }
  // Booking-count badges on the calendar — only show if we already have data
  // for the displayed month. Cheap to compute from `activeAll` since the day
  // page only fetches the day; we'd need a wider fetch to populate this. Skip
  // for now; can be added with a separate light query later.

  // Staff filter
  const staffStats = allStaff.map((s) => ({
    ...s,
    count: activeAll.filter((b) => b.staff_id === s.id).length,
  }));
  const totalCount = activeAll.length;

  const dayLabel = `${dayLabels[dow]}, ${formatShortDate(baseDate)}`;
  const isToday = baseDate === today;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Harmonogram</h1>
          <p className="mt-1 text-sm text-zinc-500">{dayLabel}</p>
        </div>

        {/* Prev / Today / Next */}
        <div className="flex items-center gap-2">
          <Link
            href={navUrl(prevDate)}
            aria-label="Poprzedni dzień"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          {!isToday && (
            <Link
              href={navUrl(today)}
              className="flex h-9 items-center rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              Dziś
            </Link>
          )}
          <Link
            href={navUrl(nextDate)}
            aria-label="Następny dzień"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Staff filter — single-select */}
      {allStaff.length > 1 && (() => {
        const chips: StaffFilterChip[] = [
          {
            id: "all",
            label: "Wszyscy",
            count: totalCount,
            active: !selectedStaffId,
            href: navUrl(baseDate, null),
          },
          ...staffStats.map((s) => ({
            id: s.id,
            label: s.name,
            color: s.color,
            count: s.count,
            active: selectedStaffId === s.id,
            href: navUrl(baseDate, s.id),
          })),
        ];
        return <StaffFilterBar chips={chips} className="mt-5" />;
      })()}

      {/* Body: timeline + calendar sidebar */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 overflow-x-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
          <DayTimeline
            bookings={active}
            visibleStaff={visibleStaff}
            allStaff={allStaff}
            allServices={allServices}
            businessOpen={businessOpen}
            businessClose={businessClose}
            closed={closed}
          />
        </div>

        <aside className="w-full lg:w-72 shrink-0">
          <CalendarPicker
            today={today}
            selectedDate={baseDate}
            days={calendarDays}
            hrefMap={hrefMap}
            size="sm"
            allowPastNav
          />
        </aside>
      </div>
    </section>
  );
}
