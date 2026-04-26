import Link from "next/link";
import { getAllStaff } from "@/lib/db/staff";
import { toggleStaffActiveAction } from "./actions";
import { DeleteStaffButton } from "./delete-button";

export const metadata = { title: "Pracownicy", robots: { index: false } };

export default async function PracownicyPage() {
  const staff = await getAllStaff();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pracownicy</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Każdy pracownik może obsługiwać klientów równolegle.
          </p>
        </div>
        <Link
          href="/admin/pracownicy/nowy"
          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          <span className="hidden sm:inline">+ Dodaj</span>
          <span className="sm:hidden">+</span>
        </Link>
      </div>

      {staff.length === 0 ? (
        <p className="text-sm text-zinc-500">Brak pracowników.</p>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4 ${
                s.active ? "" : "opacity-50"
              }`}
            >
              <div
                className="h-10 w-10 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-100">{s.name}</p>
                {s.bio && (
                  <p className="mt-0.5 text-sm text-zinc-500 line-clamp-1">{s.bio}</p>
                )}
                {!s.active && (
                  <p className="mt-0.5 text-xs uppercase tracking-wider text-zinc-600">Nieaktywny</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/pracownicy/${s.id}`}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Edytuj
                </Link>
                <form action={toggleStaffActiveAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(s.active)} />
                  <button
                    type="submit"
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    {s.active ? "Ukryj" : "Aktywuj"}
                  </button>
                </form>
                <DeleteStaffButton id={s.id} name={s.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
