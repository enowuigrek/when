import Link from "next/link";
import { getActiveStaff } from "@/lib/db/staff";
import { getBusinessHours } from "@/lib/db/services";
import { getAllStaffSchedules, getTimeOffInRange } from "@/lib/db/staff-schedule";
import { warsawToday, addDays } from "@/lib/slots";
import { dayLabels } from "@/lib/business";
import { GrafikCell } from "./grafik-cell";
import { TimeOffSection } from "../pracownicy/time-off-section";
import { getStaffTimeOff } from "@/lib/db/staff-schedule";

export const metadata = { title: "Grafik", robots: { index: false } };

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0] as const; // Mon → Sun

export default async function GrafikPage({
  searchParams,
}: {
  searchParams: Promise<{ pracownik?: string }>;
}) {
  const { pracownik: selectedStaffId } = await searchParams;

  const [staff, hours, allSchedules] = await Promise.all([
    getActiveStaff(),
    getBusinessHours(),
    getAllStaffSchedules(),
  ]);

  // Fetch time-off for the next 30 days to show upcoming absences
  const today = warsawToday();
  const horizon = addDays(today, 30);
  const timeOffAll = await getTimeOffInRange(today, horizon);

  // Per-staff time-off for sidebar (selected staff)
  const selectedStaff = staff.find((s) => s.id === selectedStaffId) ?? staff[0] ?? null;
  const selectedTimeOff = selectedStaff ? await getStaffTimeOff(selectedStaff.id) : [];

  // Business hours helpers
  function bizHours(dow: number) {
    const h = hours.find((h) => h.day_of_week === dow);
    return { open: h?.open_time?.slice(0, 5) ?? null, close: h?.close_time?.slice(0, 5) ?? null, closed: h?.closed ?? true };
  }

  function scheduleFor(staffId: string, dow: number) {
    return allSchedules.find((r) => r.staff_id === staffId && r.day_of_week === dow);
  }

  function timeOffFor(staffId: string, dow: number): typeof timeOffAll[0] | undefined {
    // Check if any upcoming time-off covers a recurring weekday (approximate: check next occurrence)
    const [y, m, d] = today.split("-").map(Number);
    // Find next date with this dow
    for (let i = 0; i <= 30; i++) {
      const date = addDays(today, i);
      const [dy, dm, dd] = date.split("-").map(Number);
      const dateDow = new Date(Date.UTC(dy, dm - 1, dd, 12)).getUTCDay();
      if (dateDow === dow) {
        return timeOffAll.find((t) => t.staff_id === staffId && t.start_date <= date && t.end_date >= date);
      }
    }
    return undefined;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Grafik</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Godziny pracy i nieobecności pracowników. Kliknij komórkę żeby edytować.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* ── Weekly schedule grid ─────────────────────────────────────── */}
        <div className="flex-1 overflow-x-auto rounded-xl border border-zinc-800/60" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
                <th className="w-24 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Dzień</th>
                {staff.map((s) => (
                  <th key={s.id} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <Link
                      href={`/admin/grafik?pracownik=${s.id}`}
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
              {ORDERED_DAYS.map((dow, i) => {
                const biz = bizHours(dow);
                return (
                  <tr key={dow} className={`border-b border-zinc-800/60 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/20"}`}>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-zinc-300">{dayLabels[dow]}</p>
                      {biz.closed && <p className="text-xs text-zinc-700">wolne biznesu</p>}
                      {!biz.closed && <p className="font-mono text-xs text-zinc-600">{biz.open}–{biz.close}</p>}
                    </td>
                    {staff.map((s) => (
                      <td key={s.id} className="px-2 py-2 align-top">
                        <GrafikCell
                          staffId={s.id}
                          staffColor={s.color}
                          dayOfWeek={dow}
                          scheduleRow={scheduleFor(s.id, dow)}
                          timeOff={timeOffFor(s.id, dow)}
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
                    href={`/admin/grafik?pracownik=${s.id}`}
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

              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-200">Nieobecności — {selectedStaff.name}</h2>
                <Link href={`/admin/pracownicy/${selectedStaff.id}`} className="text-xs text-zinc-500 hover:text-zinc-300">
                  Edytuj →
                </Link>
              </div>

              <TimeOffSection staffId={selectedStaff.id} timeOff={selectedTimeOff} />
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-6 rounded border border-zinc-700 bg-zinc-900/40" /> godziny pracy</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-6 rounded border border-zinc-800/40" /> wolny</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-6 rounded border border-zinc-700 bg-zinc-900/40 text-[8px] text-red-400">L4</span> nieobecność</span>
        <span className="text-zinc-700">(domyślne) = używa godzin biznesu z ustawień</span>
      </div>
    </section>
  );
}
