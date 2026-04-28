"use client";

import { useState } from "react";
import { renameGroupAction, deleteGroupAction, setGroupMembersAction } from "./actions";
import type { StaffGroupWithMembers } from "@/lib/db/staff-groups";

type Staff = { id: string; name: string; color: string };

export function GroupCard({ group, allStaff }: { group: StaffGroupWithMembers; allStaff: Staff[] }) {
  const [editingName, setEditingName] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [members, setMembers] = useState<Set<string>>(new Set(group.member_ids));
  const dirty =
    members.size !== group.member_ids.length ||
    [...members].some((id) => !group.member_ids.includes(id));

  function toggle(id: string) {
    setMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
      <div className="flex items-start justify-between gap-3">
        {editingName ? (
          <form action={renameGroupAction} onSubmit={() => setEditingName(false)} className="flex flex-1 items-center gap-2">
            <input type="hidden" name="id" value={group.id} />
            <input
              name="name"
              defaultValue={group.name}
              autoFocus
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            <button type="submit" className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-zinc-950">Zapisz</button>
            <button type="button" onClick={() => setEditingName(false)} className="text-xs text-zinc-500">Anuluj</button>
          </form>
        ) : (
          <div className="flex-1">
            <h3 className="text-base font-semibold text-zinc-100">{group.name}</h3>
            <p className="mt-0.5 text-xs text-zinc-500">{members.size} {members.size === 1 ? "pracownik" : "pracowników"}</p>
          </div>
        )}
        {!editingName && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingName(true)} className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:border-zinc-500">Zmień nazwę</button>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)} className="rounded-md border border-red-900/50 px-3 py-1 text-xs text-red-400 hover:border-red-700">Usuń</button>
            ) : (
              <form action={deleteGroupAction} className="flex items-center gap-1.5">
                <input type="hidden" name="id" value={group.id} />
                <button type="submit" className="rounded-md bg-red-700 px-3 py-1 text-xs font-medium text-zinc-100">Tak, usuń</button>
                <button type="button" onClick={() => setConfirmDel(false)} className="text-xs text-zinc-500">Anuluj</button>
              </form>
            )}
          </div>
        )}
      </div>

      <form action={setGroupMembersAction} className="mt-4">
        <input type="hidden" name="group_id" value={group.id} />
        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-600">Pracownicy</p>
        {allStaff.length === 0 ? (
          <p className="text-xs text-zinc-500">Brak pracowników do przypisania.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allStaff.map((s) => {
              const checked = members.has(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                    checked
                      ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="staff_id"
                    value={s.id}
                    checked={checked}
                    onChange={() => toggle(s.id)}
                    className="sr-only"
                  />
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </label>
              );
            })}
          </div>
        )}
        {dirty && (
          <button
            type="submit"
            className="mt-3 rounded-full bg-[var(--color-accent)] px-4 py-1 text-xs font-medium text-zinc-950"
          >
            Zapisz pracowników
          </button>
        )}
      </form>
    </div>
  );
}
