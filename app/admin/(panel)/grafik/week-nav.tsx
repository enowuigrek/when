"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

function addDays(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}

function fmt(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return `${String(day).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

export function WeekNav({
  weekStart,
  staffParam,
  pracownicyParam,
  todayMonday,
}: {
  weekStart: string; // Monday
  staffParam?: string;
  pracownicyParam?: string;
  todayMonday: string;
}) {
  const router = useRouter();
  const weekEnd = addDays(weekStart, 6);
  const prev = addDays(weekStart, -7);
  const next = addDays(weekStart, 7);

  function buildHref(monday: string) {
    const params = new URLSearchParams();
    params.set("tydzien", monday);
    if (staffParam) params.set("pracownik", staffParam);
    if (pracownicyParam) params.set("pracownicy", pracownicyParam);
    return `/admin/grafik?${params.toString()}`;
  }

  const isCurrent = weekStart === todayMonday;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={buildHref(prev)}
        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-600"
        aria-label="Poprzedni tydzień"
      >
        ←
      </Link>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-1.5 text-sm">
        <span className="font-mono text-zinc-300">{fmt(weekStart)}</span>
        <span className="mx-1.5 text-zinc-600">–</span>
        <span className="font-mono text-zinc-300">{fmt(weekEnd)}</span>
      </div>

      <Link
        href={buildHref(next)}
        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-600"
        aria-label="Następny tydzień"
      >
        →
      </Link>

      {!isCurrent && (
        <Link
          href={buildHref(todayMonday)}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        >
          Dziś
        </Link>
      )}

      <input
        type="date"
        defaultValue={weekStart}
        onChange={(e) => {
          const picked = e.target.value;
          if (!picked) return;
          const [y, m, d] = picked.split("-").map(Number);
          const dt = new Date(Date.UTC(y, m - 1, d));
          const dow = dt.getUTCDay();
          const diff = dow === 0 ? -6 : 1 - dow;
          router.push(buildHref(addDays(picked, diff)));
        }}
        className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-sm text-zinc-300"
      />
    </div>
  );
}
