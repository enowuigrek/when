"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerAction, type CreateCustomerState } from "./actions";

const inp =
  "w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";

export function NewCustomerDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<CreateCustomerState, FormData>(
    createCustomerAction,
    { status: "idle" }
  );

  useEffect(() => {
    if (state.status === "ok") {
      setOpen(false);
      router.push(`/admin/klienci/${state.id}`);
    }
  }, [state, router]);

  const err = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        + Dodaj
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-800/60 bg-zinc-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Nowy klient</h2>
            <form action={action} className="space-y-3">
              <Field label="Imię i nazwisko *" name="name" error={err.name} />
              <Field label="Telefon *" name="phone" type="tel" error={err.phone} />
              <Field label="Email" name="email" type="email" error={err.email} />
              <Field label="Notatka" name="notes" as="textarea" error={err.notes} />

              {state.status === "error" && !Object.keys(err).length && (
                <p className="text-xs text-red-400">{state.message}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                >
                  {pending ? "Dodaję…" : "Dodaj klienta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
  as,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  as?: "textarea";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      {as === "textarea" ? (
        <textarea name={name} rows={2} className={inp} />
      ) : (
        <input type={type} name={name} className={inp} />
      )}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
