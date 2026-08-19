import type { ReactNode } from "react";
import { BookingManagementButton, type BookingForModal } from "@/components/booking-management-modal";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

/**
 * One booking in a list, opening its management window.
 *
 * The customer profile and the staff profile were drawing the same row twice —
 * time and date on the left, a title, a line under it, a price on the right —
 * and differing only in which field led. On a customer's page that is the
 * service; on a member of staff's page it is the customer. So the two fields
 * are slots, and the shape is written once.
 */
export function BookingRow({
  booking,
  allStaff,
  title,
  subtitle,
  badge,
  price,
}: {
  booking: BookingForModal;
  allStaff: { id: string; name: string; color: string }[];
  title: ReactNode;
  /** Second line — the other party, or the service. */
  subtitle?: ReactNode;
  /** Shown beside the title, for anything other than a plain confirmed booking. */
  badge?: ReactNode;
  price?: number | null;
}) {
  return (
    <li>
      <BookingManagementButton
        booking={booking}
        allStaff={allStaff}
        className="flex w-full items-start gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
      >
        <div className="shrink-0">
          <p className="font-mono text-sm text-zinc-300">{formatWarsawTime(booking.startsAt)}</p>
          <p className="whitespace-nowrap font-mono text-xs text-zinc-600">
            {formatWarsawDate(booking.startsAt)}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{title}</span>
            {badge}
          </div>
          {subtitle && <div className="mt-0.5 min-w-0">{subtitle}</div>}
        </div>

        {price !== null && price !== undefined && (
          <span className="shrink-0 font-mono text-sm text-zinc-400">{price} zł</span>
        )}
      </BookingManagementButton>
    </li>
  );
}

/** The coloured dot plus name used as a row's second line. */
export function StaffLine({ name, color }: { name: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate text-xs text-zinc-500">{name}</span>
    </span>
  );
}
