"use client";

import { useTransition } from "react";
import { deleteServiceAction } from "./actions";

export function DeleteServiceButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();

  function handleClick() {
    if (!confirm(`Usunąć usługę "${name}"?\n\nTej operacji nie można cofnąć.`)) return;
    const fd = new FormData();
    fd.set("id", id);
    start(() => deleteServiceAction(fd));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-red-500 hover:border-red-900 hover:bg-red-950/30 hover:text-red-400 transition-colors disabled:opacity-50"
    >
      {pending ? "…" : "Usuń"}
    </button>
  );
}
