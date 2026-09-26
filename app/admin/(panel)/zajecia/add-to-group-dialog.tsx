"use client";

import { useState } from "react";
import { GroupEnrollForm, type GroupEnrollProps } from "./group-enroll-form";

/**
 * Adding somebody to a group, from the group's own card on the classes page.
 *
 * The form opens in place rather than in a modal: the page is a list of
 * groups, and the card you typed into should stay where you were reading.
 */
export function AddToGroupDialog(props: GroupEnrollProps) {
  const [open, setOpen] = useState(false);
  // Bumped to hand the form a clean slate after a sign-up, which is also how
  // its action state is reset — signing two children up in a row is the
  // normal case, not the exception.
  const [round, setRound] = useState(0);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
      >
        {props.words.action}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <GroupEnrollForm
        key={round}
        {...props}
        onAgain={() => setRound((r) => r + 1)}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
