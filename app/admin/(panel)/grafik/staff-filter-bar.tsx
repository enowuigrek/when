"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Staff = { id: string; name: string; color: string };

export function StaffFilterBar({
  staff,
  selectedIds,
}: {
  staff: Staff[];
  selectedIds: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildUrl(ids: string[], nextPracownik?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (ids.length === 0 || ids.length === staff.length) {
      params.delete("pracownicy");
    } else {
      params.set("pracownicy", ids.join(","));
    }
    if (nextPracownik !== undefined) {
      if (nextPracownik) params.set("pracownik", nextPracownik);
      else params.delete("pracownik");
    }
    return `${pathname}?${params.toString()}`;
  }

  function toggle(id: string) {
    const isSelected = selectedIds.includes(id);
    const next = isSelected
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id];

    // If we're adding this person, make them the active sidebar target too
    // If we're removing them and they were the active one, switch to first remaining
    const currentPracownik = searchParams.get("pracownik") ?? "";
    let nextPracownik: string | undefined = undefined;
    if (!isSelected) {
      nextPracownik = id; // newly selected → show their time-off
    } else if (currentPracownik === id) {
      nextPracownik = next[0] ?? ""; // was active, switch to first remaining
    }

    router.push(buildUrl(next, nextPracownik));
  }

  function clearFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("pracownicy");
    router.push(`${pathname}?${params.toString()}`);
  }

  const allSelected = selectedIds.length === 0;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <button
        onClick={clearFilter}
        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
          allSelected
            ? "border-zinc-600 bg-zinc-800/60 text-zinc-100"
            : "border-zinc-800/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
        }`}
      >
        Wszyscy
        <span className="font-mono text-zinc-500">{staff.length}</span>
      </button>
      {staff.map((s) => {
        const active = selectedIds.includes(s.id);
        return (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "border-zinc-600 bg-zinc-800/60 text-zinc-100"
                : "border-zinc-800/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
