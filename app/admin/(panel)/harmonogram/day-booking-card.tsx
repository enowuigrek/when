"use client";

import { BookingManagementButton, type BookingForModal, type ServiceOption } from "@/components/booking-management-modal";

type Staff = { id: string; name: string; color: string };

type Props = {
  booking: BookingForModal;
  allStaff: Staff[];
  allServices: ServiceOption[];
  timeLabel: string;
  color: string;
};

export function DayBookingCard({ booking, allStaff, allServices, timeLabel, color }: Props) {
  const hasNotes = !!(booking.notes && booking.notes.trim().length > 0);
  return (
    <BookingManagementButton
      booking={booking}
      allStaff={allStaff}
      allServices={allServices}
      className="block w-full rounded px-2 py-1.5 text-left transition-colors hover:brightness-125"
    >
      <div style={{ backgroundColor: `${color}20`, borderLeft: `2px solid ${color}`, padding: "2px 6px", borderRadius: 4 }}>
        <div className="flex items-start justify-between gap-1">
          <p className="font-mono text-xs text-zinc-300">{timeLabel}</p>
          {hasNotes && (
            <span
              title="Notatka — kliknij aby zobaczyć"
              className="text-zinc-400"
              aria-label="Ma notatkę"
            >
              {/* note icon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="14" y2="17" />
              </svg>
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-zinc-200 leading-tight">{booking.customerName}</p>
        {booking.serviceName && <p className="text-xs text-zinc-500">{booking.serviceName}</p>}
      </div>
    </BookingManagementButton>
  );
}
