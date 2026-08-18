"use client";

import { BookingManagementButton, type BookingForModal } from "@/components/booking-management-modal";

type Staff = { id: string; name: string; color: string };

/**
 * Compact booking card rendered in the harmonogram day-view table.
 * Wraps BookingManagementButton so clicking opens the management modal.
 */
export function DayBookingCard({
  booking,
  allStaff,
  timeLabel,
  color,
}: {
  booking: BookingForModal;
  allStaff: Staff[];
  timeLabel: string;
  color: string;
}) {
  return (
    <BookingManagementButton
      booking={booking}
      allStaff={allStaff}
      className="block w-full rounded px-1.5 py-1 text-left transition-colors hover:brightness-125"
    >
      <div
        style={{
          backgroundColor: `${color}18`,
          borderLeft: `2px solid ${color}`,
          padding: "2px 6px",
          borderRadius: 3,
        }}
      >
        <p className="font-mono text-xs text-zinc-300">{timeLabel}</p>
        <p className="truncate text-xs font-medium text-zinc-200">{booking.customerName}</p>
        {booking.serviceName && (
          <p className="truncate text-[10px] text-zinc-500">{booking.serviceName}</p>
        )}
      </div>
    </BookingManagementButton>
  );
}
