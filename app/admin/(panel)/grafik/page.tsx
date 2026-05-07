import Link from "next/link";
import { getActiveStaff } from "@/lib/db/staff";
import { getBusinessHours, getServices } from "@/lib/db/services";
import type { ServiceOption } from "@/components/booking-management-modal";
import { getAllStaffSchedules, getTimeOffInRange } from "@/lib/db/staff-schedule";
import { warsawToday, addDays, mondayOfWeek } from "@/lib/slots";
import { dayLabels } from "@/lib/business";
import { GrafikCell } from "./grafik-cell";
import { TimeOffSection } from "../pracownicy/time-off-section";
import { getStaffTimeOff } from "@/lib/db/staff-schedule";
import { GrafikWeekPicker } from "./grafik-week-picker";
import { StaffFilterBar, type StaffFilterChip } from "@/components/staff-filter-bar";

export const metadata = { title: "Grafik", robots: { index: false } };

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0] as const; // Mon → Sun

export default async function GrafikPage({
  searchParams,
}: {
  searchParams: Promise<{ pracownik?: string; pracownicy?: string; tydzien?: string }>;
}) {
  const { pracownik: selectedStaffId, pracownicy: pracownicyParam, tydzien: weekParam } = await searchParams;

  const today = warsawToday();
  const todayMonday = mondayOfWeek(today);
  const weekStart = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? mondayOfWeek(weekParam) : todayMonday;
  const weekEnd = addDays(weekStart, 6);

  const [staff, hours, allSchedules, timeOffWeek, allServicesRaw] = await Promise.all([
    getActiveStaff(),
    getBusinessHours(),
    getAllStaffSchedules(),
    getTimeOffInRange(weekStart, weekEnd),
    getServices(),
  ]);
  const allServices: ServiceOption[] = allServicesRaw.map((s) => ({
    id: s.id, name: s.name, duration_min: s.duration_min, price_pln: s.price_pln,
  }));

  // ── Staff filtering ─────────────────────────────────────────────────────────
  // `pracownicy` = comma-separated IDs of staff whose columns are visible in the table
  const visibleStaffIds: string[] = pracownicyParam
    ? pracownicyParam.split(",").filter((id) => staff.some((s) => s.id === id))
    : [];
  const visibleStaff = visibleStaffIds.length > 0
    ? staff.filter((s) => visibleStaffIds.includes(s.id))
    : staff;

  // `pracownik` = single staff for sidebar time-off editor
  // Falls back to first visible, then first overall
  const selectedStaff =
    staff.find((s) => s.id === selectedStaffId) ??
    visibleStaff[0] ??
    staff[0] ??
    null;

  const selectedTimeOff = selectedStaff ? await getStaffTimeOff(selectedStaff.id) : [];

  // ── Build week dates — keep all 7 days, closed days render as a placeholder
  const weekDates = ORDERED_DAYS.map((dow, i) => ({ dow, date: addDays(weekStart, i) }));

  function bizHours(dow: number) {
    const h = hours.find((h) => h.day_of_week === dow);
    return { open: h?.open_time?.slice(0, 5) ?? null, close: h?.close_time?.slice(0, 5) ?? null, closed: h?.closed ?? true };
  }

  function scheduleFor(staffId: string, dow: number) {
    return allSchedules.find((r) => r.staff_id === staffId && r.day_of_week === dow);
  }

  function timeOffOn(staffId: string, date: string) {
    return timeOffWeek.find((t) => t.staff_id === staffId && t.start_date <= date && t.end_date >= date);
  }

  // Helper to build sidebar chip URLs (preserves both pracownicy and tydzien)
  function sidebarHref(staffId: string) {
    const params = new URLSearchParams();
    params.set("tydzien", weekStart);
    params.set("pracownik", staffId);
    if (pracownicyParam) params.set("pracownicy", pracownicyParam);
    return `/admin/grafik?${params.toString()}`;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Grafik</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Godziny pracy i nieobecności pracowników. Kliknij komórkę żeby edytować lub dodać urlop.
        </p>
      </div>

      {/* Staff filter chips — multi-select */}
      {staff.length > 1 && (() => {
        const allActive = visibleStaffIds.length === 0;

        // Build the URL representing "the state after toggling this chip".
        function buildHref(nextIds: string[], nextPracownik: string | null) {
          const params = new URLSearchParams();
          params.set("tydzien", weekStart);
          // Empty == "all" → drop the param. Full == "all" → also drop.
          if (nextIds.length > 0 && nextIds.length < staff.length) {
            params.set("pracownicy", nextIds.join(","));
          }
          if (nextPracownik) params.set("pracownik", nextPracownik);
          return `/admin/grafik?${params.toString()}`;
        }

        const chips: StaffFilterChip[] = [
          {
            id: "all",
            label: "Wszyscy",
            active: allActive,
            href: buildHref([], selectedStaff?.id ?? null),
          },
          ...staff.map((s) => {
            const isSel = visibleStaffIds.includes(s.id);
            const next = isSel
              ? visibleStaffIds.filter((x) => x !== s.id)
              : [...visibleStaffIds, s.id];
            // Sidebar editor target: select new staff when adding; pick first
            // remaining when removing the currently active one.
            let nextPracownik: string | null;
            if (!isSel) nextPracownik = s.id;
            else if (selectedStaff?.id === s.id) nextPracownik = next[0] ?? null;
            else nextPracownik = selectedStaff?.id ?? null;
            return {
              id: s.id,
              label: s.name,
              color: s.color,
              active: isSel,
              href: buildHref(next, nextPracownik),
            };
          }),
        ];
        return <StaffFilterBar chips={chips} className="mt-5" />;
      })()}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* ── Weekly schedule grid ─────────────────────────────────────── */}
        <div className="flex-1 overflow-x-auto rounded-xl border border-zinc-800/60" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
                <th className="w-24 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Dzień</th>
                {visibleStaff.map((s) => (
                  <th key={s.id} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span style={{ color: s.color }}>{s.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDates.map(({ dow, date }, i) => {
                const biz = bizHours(dow);
                const isToday = date === today;
                const [, m, d] = date.split("-");
                return (
                  <tr key={date} className={`border-b border-zinc-800/60 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/20"} ${biz.closed ? "opacity-60" : ""}`}>
                    <td className="px-4 py-5 align-top">
                      <p className={`font-medium ${isToday ? "text-[var(--color-accent)]" : "text-zinc-200"}`}>
                        {dayLabels[dow]}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-zinc-500">{d}.{m}</p>
                      {biz.closed
                        ? <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-600">Zamknięte</p>
                        : <p className="mt-1 font-mono text-[11px] text-zinc-600">{biz.open}–{biz.close}</p>}
                    </td>
                    {visibleStaff.map((s) => (
                      <td key={s.id} className="px-2 py-3 align-top">
                        {biz.closed ? (
                          <div className="flex h-9 w-full items-center justify-center rounded-lg border border-zinc-800/30 bg-transparent text-[11px] uppercase tracking-wider text-zinc-700">
                            Zamknięte
                          </div>
                        ) : (
                          <GrafikCell
                            staffId={s.id}
                            staffColor={s.color}
                            dayOfWeek={dow}
                            dateStr={date}
                            scheduleRow={scheduleFor(s.id, dow)}
                            timeOff={timeOffOn(s.id, date)}
                            businessOpen={biz.open}
                            businessClose={biz.close}
                            allStaff={staff}
                            allServices={allServices}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Sidebar: week picker + selected staff time-off ─────────── */}
        {staff.length > 0 && selectedStaff && (
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <GrafikWeekPicker
              weekStart={weekStart}
              todayMonday={todayMonday}
              today={today}
              staffParam={selectedStaffId}
              pracownicyParam={pracownicyParam}
            />
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-5">
              {/* Staff picker — highlights filtered staff */}
              <div className="mb-4 flex flex-wrap gap-2">
                {staff.map((s) => {
                  const isFiltered = visibleStaffIds.length === 0 || visibleStaffIds.includes(s.id);
                  const isActive = s.id === selectedStaff.id;
                  return (
                    <Link
                      key={s.id}
                      href={sidebarHref(s.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        isActive
                          ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                          : isFiltered
                          ? "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                          : "border-zinc-800/40 text-zinc-700 hover:border-zinc-700 hover:text-zinc-500"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${!isFiltered ? "opacity-30" : ""}`} style={{ backgroundColor: s.color }} />
                      {s.name}
                    </Link>
                  );
                })}
              </div>

              <h2 className="mb-3 text-sm font-semibold text-zinc-200">
                Nieobecności — {selectedStaff.name}
              </h2>
              <p className="mb-3 text-xs text-zinc-500">
                Możesz też dodać nieobecność klikając w konkretny dzień grafiku.
              </p>

              <TimeOffSection staffId={selectedStaff.id} timeOff={selectedTimeOff} />
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500">
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-8 rounded border border-zinc-700 bg-zinc-900/60" />
          godziny pracy
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-8 rounded border border-zinc-800/40 bg-transparent" />
          wolny
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-flex h-4 w-8 items-center justify-center rounded border border-red-900/50 bg-zinc-900/40 font-medium text-red-400" style={{ fontSize: 9 }}>L4</span>
          nieobecność
        </span>
      </div>
    </section>
  );
}
