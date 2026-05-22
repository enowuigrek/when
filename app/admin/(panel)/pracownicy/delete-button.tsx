"use client";

import { deleteStaffAction } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteStaffButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteStaffAction}
      onSubmit={(e) => {
        if (!confirm(`Usunąć ${name}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="danger" size="sm">
        Usuń
      </Button>
    </form>
  );
}
