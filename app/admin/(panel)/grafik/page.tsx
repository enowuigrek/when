import Link from "next/link";
import { getActiveStaff } from "@/lib/db/staff";
import { getBusinessHours } from "@/lib/db/services";
import { getAllStaffSchedules, getTimeOffInRange } from "@/lib/db/staff-schedule";
import { warsawToday, addDays, mondayOfWeek } from "@/lib/slots";
import { dayLabels } from "@/lib/business";
import { GrafikCell } from "./grafik-cell";
import { TimeOffSection } from "../pracownicy/time-off-section";
import { getStaffTimeOff } from "@/lib/db/staff-schedule";
import { WeekNav } from "./week-nav";

export const metadata = { title: "Grafik", robots: { index: false } };

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0] as const; // Mon → Sun
const SHORT_DOW = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"] as const;

export default async function GrafikPage({
  searchParams,
}: {
  searchParams: Promise<{ pracownik?: string; tydzien?: string }>;
}) {
  const { pracownik: selectedStaffId, tydzien: weekParam } = await searchParams;

  const today = warsawToday();
  const todayMonday = mondayOfWeek(today);
  const weekStart = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? mondayOfWeek(weekParam) : todayMonday;
  const weekEnd = addDays(weekStart, 6);

  const [staff, hours, allSchedules, timeOffWeek] = await Promise.all([
    getActiveStaff(),
    getBusinessHours(),
    getAllStaffSchedules(),
    getTimeOffInRange(weekStart, weekEnd),
  ]);

  // Per-staff time-off list for sidebar — runs after staff resolves (needs staffId)
  const selectedStaff = staff.find((s) => s.id === selectedStaffId) ?? staff[0] ?? null;
  const selectedTimeOff = selectedStaff ? await getStaffTimeOff(selectedStaff.id) : [];

  // Build week dates — skip days where business is closed
  const weekDates = ORDERED_DAYS
    .map((dow, i) => ({ dow, date: addDays(weekStart, i) }))
    .filter(({ dow }) => {
      const h = hours.find((h) => h.day_of_week === dow);
      return !h?.closed;
    });

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

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Grafik</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Godziny pracy i nieobecności pracowników. Kliknij komórkę żeby edytować lub dodać urlop.
          </p>
        </div>
        <WeekNav weekStart={weekStart} staffParam={selectedStaffId} todayMonday={todayMonday} />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* ── Weekly schedule grid ─────────────────────────────────────── */}
        <div className="flex-1 overflow-x-auto rounded-xl border border-zinc-800/60" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
                <th className="w-28 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Dzień</th>
                {staff.map((s) => (
                  <th key={s.id} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <Link
                      href={`/admin/grafik?pracownik=${s.id}&tydzien=${weekStart}`}
                      className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span style={{ color: s.color }}>{s.name}</span>
                    </Link>
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
                  <tr key={date} className={`border-b border-zinc-800/60 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/20"}`}>
                    <td className="px-4 py-3 align-top">
                      <p className={`font-medium ${isToday ? "text-[var(--color-accent)]" : "text-zinc-300"}`}>
                        {dayLabels[dow]}
                        <span className="ml-1.5 font-mono text-xs text-zinc-600">{d}.{m}</span>
                      </p>
                      {biz.closed && <p className="text-xs text-zinc-700">wolne biznesu</p>}
                      {!biz.closed && <p className="font-mono text-xs text-zinc-600">{biz.open}–{biz.close}</p>}
                    </td>
                    {staff.map((s) => (
                      <td key={s.id} className="px-2 py-2 align-top">
                        <GrafikCell
                          staffId={s.id}
                          staffColor={s.color}
                          dayOfWeek={dow}
                          dateStr={date}
                          scheduleRow={scheduleFor(s.id, dow)}
                          timeOff={timeOffOn(s.id, date)}
                          businessOpen={biz.open}
                          businessClose={biz.close}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Sidebar: selected staff time-off ─────────────────────────── */}
        {staff.length > 0 && selectedStaff && (
          <div className="w-full lg:w-80 shrink-0">
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-5">
              {/* Staff picker */}
              <div className="mb-4 flex flex-wrap gap-2">
                {staff.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/grafik?pracownik=${s.id}&tydzien=${weekStart}`}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                      s.id === selectedStaff.id
                        ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </Link>
                ))}
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
        <span className="text-zinc-600">(domyślne) = godziny z ustawień</span>
      </div>
    </section>
  );
}
