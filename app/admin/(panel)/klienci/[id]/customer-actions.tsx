"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { deleteCustomerAction, updateCustomerContactAction } from "../actions";

export function CustomerActions({
  customerId,
  customerName,
  customerPhone,
  customerEmail,
}: {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [contactState, contactAction, contactPending] = useActionState(updateCustomerContactAction, { status: "idle" as const });

  const newBookingHref =
    `/admin/rezerwacja/nowa?phone=${encodeURIComponent(customerPhone)}` +
    `&name=${encodeURIComponent(customerName)}` +
    (customerEmail ? `&email=${encodeURIComponent(customerEmail)}` : "");

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={newBookingHref}
          className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          + Rezerwacja
        </Link>

        <button
          type="button"
          onClick={() => { setEditingContact((v) => !v); setConfirming(false); }}
          className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500"
        >
          Edytuj kontakt
        </button>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full border border-red-900/50 px-4 py-1.5 text-sm text-red-400 transition-colors hover:border-red-700 hover:bg-red-900/20"
          >
            Usuń klienta
          </button>
        ) : (
          <form action={deleteCustomerAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={customerId} />
            <span className="text-sm text-zinc-400">Na pewno?</span>
            <button
              type="submit"
              className="rounded-full bg-red-700 px-4 py-1.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-red-600"
            >
              Tak, usuń
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
            >
              Anuluj
            </button>
          </form>
        )}
      </div>

      {editingContact && (
        <form
          action={(fd) => {
            contactAction(fd);
          }}
          onSubmit={() => {
            // auto-close on success handled via state
          }}
          className="mt-2 w-full rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 sm:w-80"
        >
          <input type="hidden" name="id" value={customerId} />
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Edytuj kontakt</p>

          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Telefon *</label>
              <input
                type="tel"
                name="phone"
                defaultValue={customerPhone}
                required
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">E-mail</label>
              <input
                type="email"
                name="email"
                defaultValue={customerEmail ?? ""}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
          </div>

          {contactState.status === "error" && (
            <p className="mt-2 text-xs text-red-400">{contactState.message}</p>
          )}
          {contactState.status === "ok" && (
            <p className="mt-2 text-xs text-emerald-400">Zapisano.</p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingContact(false)}
              className="text-xs text-zinc-600 hover:text-zinc-400"
            >
              Zamknij
            </button>
            <button
              type="submit"
              disabled={contactPending}
              className="rounded-full bg-[var(--color-accent)] px-4 py-1 text-xs font-medium text-zinc-950 disabled:opacity-50"
            >
              {contactPending ? "…" : "Zapisz"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
