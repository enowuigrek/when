"use client";

import { useActionState, useState } from "react";
import { addToGroupAction, type AddToGroupState } from "./actions";

const input =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-[var(--color-accent)]";

/**
 * Adding a child to a group, from the group itself.
 *
 * Opened from the class rather than from an empty hour in the schedule: the
 * question the owner has is "who is coming on Monday", and answering it by
 * picking a time out of a blank grid is how a class and a haircut end up on
 * top of each other.
 */
export function AddToGroupDialog({
  groupId,
  label,
  karnet,
  dates,
}: {
  groupId: string;
  label: string;
  karnet: { lessons: number; pricePln: number } | null;
  dates: string[];
}) {
  const [open, setOpen] = useState(false);
  // Bumped to hand the form a clean slate after a sign-up, which is also how
  // its action state is reset — signing up two children in a row is the normal
  // case, not the exception.
  const [round, setRound] = useState(0);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
      >
        Dopisz dziecko
      </button>
    );
  }

  return (
    <GroupForm
      key={round}
      groupId={groupId}
      label={label}
      karnet={karnet}
      dates={dates}
      onAgain={() => setRound((r) => r + 1)}
      onClose={() => setOpen(false)}
    />
  );
}

function GroupForm({
  groupId,
  label,
  karnet,
  dates,
  onAgain,
  onClose,
}: {
  groupId: string;
  label: string;
  karnet: { lessons: number; pricePln: number } | null;
  dates: string[];
  onAgain: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"karnet" | "probne">(karnet ? "karnet" : "probne");
  const [state, formAction, pending] = useActionState<AddToGroupState, FormData>(
    addToGroupAction,
    { status: "idle" }
  );

  if (state.status === "ok") {
    return (
      <div className="mt-3 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
        <p className="text-sm text-emerald-400">{state.message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAgain}
            className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Dopisz kolejne
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Zamknij
          </button>
        </div>
      </div>
    );
  }

  const shown = mode === "karnet" ? dates : dates.slice(0, 1);

  return (
    <form
      action={formAction}
      className="mt-3 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="mode" value={mode} />
      <p className="text-xs text-zinc-500">{label}</p>

      {karnet && (
        <div className="flex gap-2">
          {(["karnet", "probne"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                mode === m
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-zinc-100"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {/* Not "4 × 220 zł" — that reads as 880. The karnet is one price
                  for the month. */}
              {m === "karnet"
                ? `Karnet — ${karnet.lessons} spotkania, ${karnet.pricePln} zł`
                : "Jedno spotkanie"}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Zapisze na: <span className="text-zinc-300">{shown.join(", ")}</span>
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="childName"
          required
          maxLength={120}
          placeholder="Imię i nazwisko dziecka *"
          className={input}
        />
        <input name="phone" type="tel" required maxLength={30} placeholder="Telefon *" className={input} />
        <input name="guardianName" maxLength={120} placeholder="Rodzic lub opiekun" className={input} />
        <input name="email" type="email" maxLength={160} placeholder="Email" className={input} />
      </div>
      <input name="notes" maxLength={1000} placeholder="Uwagi" className={input} />

      {state.status === "error" && state.message && (
        <p className="text-xs text-red-400">{state.message}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold text-[var(--color-accent-fg)] disabled:opacity-60"
        >
          {pending ? "Zapisuję…" : "Zapisz"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Anuluj
        </button>
      </div>
    </form>
  );
}
