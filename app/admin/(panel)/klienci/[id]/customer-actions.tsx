"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteCustomerAction } from "../actions";

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

  const newBookingHref =
    `/admin/rezerwacja/nowa?phone=${encodeURIComponent(customerPhone)}` +
    `&name=${encodeURIComponent(customerName)}` +
    (customerEmail ? `&email=${encodeURIComponent(customerEmail)}` : "");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={newBookingHref}
        className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        + Rezerwacja
      </Link>

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
  );
}
