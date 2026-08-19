import { AdminLink } from "@/components/admin-link";
import { PageShell } from "@/components/ui/page-shell";
import { getActiveStaff } from "@/lib/db/staff";
import { getStaffGroupsWithMembers } from "@/lib/db/staff-groups";
import { createGroupAction } from "./actions";
import { GroupCard } from "./group-card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Grupy pracowników", robots: { index: false } };

export default async function GroupsPage() {
  const [staff, groups] = await Promise.all([getActiveStaff(), getStaffGroupsWithMembers()]);

  return (
    <PageShell
      narrow
      title="Grupy pracowników"
      subtitle="Twórz grupy (np. „Premium”, „Junior”), żeby ustawiać inne ceny usług dla wybranych pracowników."
      back={
        <AdminLink href="/admin/pracownicy" className="inline-flex text-sm text-zinc-500 hover:text-zinc-300">
          ← Pracownicy
        </AdminLink>
      }
    >
      <form action={createGroupAction} className="mb-8 flex items-center gap-2">
        <input
          name="name"
          required
          minLength={2}
          maxLength={40}
          placeholder="Nazwa nowej grupy (np. Premium)"
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
        <Button type="submit" variant="primary" size="md" radius="full">
          + Dodaj grupę
        </Button>
      </form>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-5 py-8 text-center text-sm text-zinc-500">
          Brak grup. Dodaj pierwszą żeby zacząć ustawiać ceny premium.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} allStaff={staff} />
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-zinc-600">
        Po stworzeniu grupy ustawisz ceny per usługa w sekcji <AdminLink href="/admin/uslugi" className="text-zinc-400 hover:text-zinc-200">Usługi</AdminLink> — przy edycji usługi pojawi się lista grup z możliwością ustawienia ceny.
      </p>
    </PageShell>
  );
}
