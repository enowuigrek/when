"use client";

import { deleteStaffAction } from "./actions";

export function DeleteStaffButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteStaffAction}
      onSubmit={(e) => {
        if (!confirm(`Usunąć ${name}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md border border-red-900/60 px-3 py-1.5 text-xs text-red-500 hover:border-red-700/60 hover:text-red-300 transition-colors"
      >
        Usuń
      </button>
    </form>
  );
}
