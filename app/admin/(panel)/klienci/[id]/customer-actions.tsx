"use client";

import { useState, useActionState } from "react";
import { deleteCustomerAction, updateCustomerContactAction } from "../actions";
import { Button, ButtonLink } from "@/components/ui/button";

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
        <ButtonLink href={newBookingHref} variant="primary" radius="full" className="py-1.5">
          + Rezerwacja
        </ButtonLink>

        <Button
          type="button"
          variant="secondary"
          radius="full"
          onClick={() => { setEditingContact((v) => !v); setConfirming(false); }}
          className="py-1.5"
        >
          Edytuj kontakt
        </Button>

        {!confirming ? (
          <Button
            type="button"
            variant="danger"
            radius="full"
            onClick={() => setConfirming(true)}
            className="py-1.5"
          >
            Usuń klienta
          </Button>
        ) : (
          <form action={deleteCustomerAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={customerId} />
            <span className="text-sm text-zinc-400">Na pewno?</span>
            <Button type="submit" variant="dangerSolid" radius="full" className="py-1.5">
              Tak, usuń
            </Button>
            <Button
              type="button"
              variant="secondary"
              radius="full"
              onClick={() => setConfirming(false)}
              className="py-1.5"
            >
              Anuluj
            </Button>
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

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingContact(false)}
              className="px-0 text-zinc-600 hover:text-zinc-400"
            >
              Zamknij
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              radius="full"
              disabled={contactPending}
              className="py-1"
            >
              {contactPending ? "…" : "Zapisz"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
