import { AdminLink } from "@/components/admin-link";
import { PageShell } from "@/components/ui/page-shell";
import { ListRow, ListRows } from "@/components/ui/list-row";
import { StaffAvatar } from "@/components/ui/staff-avatar";
import { getAllStaff } from "@/lib/db/staff";
import { toggleStaffActiveAction } from "./actions";
import { DeleteStaffButton } from "./delete-button";

export const metadata = { title: "Pracownicy", robots: { index: false } };

export default async function PracownicyPage() {
  const staff = await getAllStaff();

  return (
    <PageShell
      title="Pracownicy"
      subtitle="Każdy pracownik może obsługiwać klientów równolegle."
      narrow
      actions={
        <>
          <AdminLink
            href="/admin/pracownicy/grupy"
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500"
          >
            Grupy
          </AdminLink>
          <AdminLink
            href="/admin/pracownicy/nowy"
            className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            <span className="hidden sm:inline">+ Dodaj</span>
            <span className="sm:hidden">+</span>
          </AdminLink>
        </>
      }
    >
      {staff.length === 0 ? (
        <p className="text-sm text-zinc-500">Brak pracowników.</p>
      ) : (
        <ListRows>
          {staff.map((s) => (
            <ListRow
              key={s.id}
              dimmed={!s.active}
              avatar={<StaffAvatar photoUrl={s.photo_url} color={s.color} name={s.name} size={40} />}
              title={s.name}
              subtitle={s.active ? s.bio : (s.bio ? `${s.bio} · nieaktywny` : "nieaktywny")}
              right={
                <>
                  <AdminLink
                    href={`/admin/pracownicy/${s.id}`}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    Edytuj
                  </AdminLink>
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
                </>
              }
            />
          ))}
        </ListRows>
      )}
    </PageShell>
  );
}
