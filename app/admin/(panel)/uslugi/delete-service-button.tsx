"use client";

import { useTransition } from "react";
import { deleteServiceAction } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteServiceButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();

  function handleClick() {
    if (!confirm(`Usunąć usługę "${name}"?\n\nTej operacji nie można cofnąć.`)) return;
    const fd = new FormData();
    fd.set("id", id);
    start(() => deleteServiceAction(fd));
  }

  return (
    <Button type="button" variant="danger" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "…" : "Usuń"}
    </Button>
  );
}
