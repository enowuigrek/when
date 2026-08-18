"use client";

import { BookingManagementButton, type BookingForModal } from "@/components/booking-management-modal";

type Staff = { id: string; name: string; color: string };

/**
 * Compact booking card rendered in the harmonogram day-view table.
 * Wraps BookingManagementButton so clicking opens the management modal.
 *
 * Fills the height it is given: the day view sizes the wrapper from the real
 * duration, so the block visually covers the time the service actually takes.
 */
export function DayBookingCard({
  booking,
  allStaff,
  timeLabel,
  color,
  compact = false,
}: {
  booking: BookingForModal;
  allStaff: Staff[];
  /** Full range, e.g. "11:00 – 12:00" — the end time is not obvious otherwise. */
  timeLabel: string;
  color: string;
  /** Short bookings only have room for the time and the name. */
  compact?: boolean;
}) {
  return (
    <BookingManagementButton
      booking={booking}
      allStaff={allStaff}
      className="block h-full w-full text-left transition-colors hover:brightness-125"
    >
      <div
        className="flex h-full flex-col overflow-hidden"
        style={{
          backgroundColor: `${color}18`,
          borderLeft: `2px solid ${color}`,
          padding: "2px 6px",
          borderRadius: 3,
        }}
      >
        <p className="font-mono text-xs text-zinc-300">{timeLabel}</p>
        <p className="truncate text-xs font-medium text-zinc-200">{booking.customerName}</p>
        {!compact && booking.serviceName && (
          <p className="truncate text-[10px] text-zinc-500">{booking.serviceName}</p>
        )}
      </div>
    </BookingManagementButton>
  );
}
