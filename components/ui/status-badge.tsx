/**
 * StatusBadge — unified booking-status pill
 *
 * Used in admin dashboard, klienci profile, booking modal, etc.
 * All styles live here so a single edit propagates everywhere.
 *
 * Usage:
 *   <StatusBadge status="confirmed" />
 *   <StatusBadge status={b.status} />
 */

export type BookingStatus =
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show"
  | "pending_payment";

export type PaymentStatus = "paid" | "refunded";

type Cfg = { label: string; cls: string };

const CONFIG: Record<BookingStatus | PaymentStatus, Cfg> = {
  // booking statuses
  confirmed: {
    label: "potwierdzona",
    cls: "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300",
  },
  cancelled: {
    label: "anulowana",
    cls: "bg-red-500/15 border border-red-500/40 text-red-300",
  },
  completed: {
    label: "zakończona",
    cls: "bg-zinc-700/60 border border-zinc-600/60 text-zinc-300",
  },
  no_show: {
    label: "nie przyszedł",
    cls: "bg-amber-500/15 border border-amber-500/40 text-amber-300",
  },
  pending_payment: {
    label: "oczekuje na płatność",
    cls: "bg-yellow-500/15 border border-yellow-500/40 text-yellow-300",
  },
  // payment statuses
  paid: {
    label: "opłacona",
    cls: "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300",
  },
  refunded: {
    label: "zwrócona",
    cls: "bg-zinc-700/60 border border-zinc-600/60 text-zinc-300",
  },
};

/** Pill badge for a booking status. */
export function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as BookingStatus];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-none ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

/** Plain-text label for a booking status (for lists, tooltips, etc.) */
export function statusLabel(status: string): string {
  return CONFIG[status as BookingStatus]?.label ?? status;
}
