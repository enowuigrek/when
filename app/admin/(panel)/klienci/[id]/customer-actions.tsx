"use client";

import { useState, useActionState } from "react";
import { fieldClasses } from "@/components/ui/field";
import { deleteCustomerAction, updateCustomerContactAction } from "../actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAdminBase } from "@/lib/use-admin-base";

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

  const adminBase = useAdminBase();
  const newBookingHref =
    `${adminBase}/rezerwacja/nowa?phone=${encodeURIComponent(customerPhone)}` +
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
            {/* Says what actually happens: the visits stay in the books, the
                person stops being identifiable in them. "Na pewno?" alone left
                the owner guessing whether the history would go too. */}
            <span className="text-sm text-zinc-400">
              Usunąć dane tego klienta? Wizyty zostaną w historii, ale bez jego
              nazwiska, telefonu i notatek.
            </span>
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
              <label className="mb-1 block text-xs text-zinc-500">Imię i nazwisko *</label>
              <input
                type="text"
                name="name"
                defaultValue={customerName}
                required
                className={fieldClasses({ size: "sm" })}
              />
              <p className="mt-1 text-[11px] text-zinc-600">
                Poprawka podmieni nazwisko także w rezerwacjach tego klienta.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Telefon *</label>
              <input
                type="tel"
                name="phone"
                defaultValue={customerPhone}
                required
                className={fieldClasses({ size: "sm" })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">E-mail</label>
              <input
                type="email"
                name="email"
                defaultValue={customerEmail ?? ""}
                className={fieldClasses({ size: "sm" })}
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
