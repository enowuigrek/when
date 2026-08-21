"use client";

import { BookingManagementButton, type BookingForModal } from "@/components/booking-management-modal";
import { NoteBadge } from "@/components/ui/note-badge";
import { useDragTime } from "./drag-time-context";

type Staff = { id: string; name: string; color: string };

/**
 * Compact booking card rendered in the harmonogram day-view table.
 * Wraps BookingManagementButton so clicking opens the management modal.
 *
 * Fills the height it is given: the day view sizes the wrapper from the real
 * duration, so the block visually covers the time the service actually takes.
 *
 * `ghost` renders the same card as a flat, inert copy — no button, no modal,
 * no drag. The schedule leaves one behind at the time a booking was picked up
 * from, and it has to be the whole card rather than a bare time: what you are
 * checking against, mid-drag, is "is that the one I meant to move".
 */
export function DayBookingCard({
  booking,
  allStaff,
  timeLabel,
  color,
  compact = false,
  openOnMount = false,
  ghost = false,
}: {
  booking: BookingForModal;
  allStaff: Staff[];
  /** Full range, e.g. "11:00 – 12:00" — the end time is not obvious otherwise. */
  timeLabel: string;
  color: string;
  /** Short bookings only have room for the time and the name. */
  compact?: boolean;
  /** Open the management modal straight away — arrived from a notification. */
  openOnMount?: boolean;
  /** Draw as the outline left behind at the original time. */
  ghost?: boolean;
}) {
  // While this booking is being dragged its own clock is the readout: same
  // spot, same size, lit in the accent so it is plainly the thing that is
  // changing. A separate floating badge would put the answer somewhere the
  // eye was not already looking. The ghost stays on the old time, so it never
  // takes the dragged value.
  const dragTime = useDragTime();
  const shownTime = ghost ? timeLabel : (dragTime ?? timeLabel);
  const timeCls = !ghost && dragTime
    ? "font-semibold text-[var(--color-accent)]"
    : "text-zinc-300";

  const body = (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        backgroundColor: `${color}18`,
        borderLeft: `2px solid ${color}`,
        padding: "2px 6px",
        borderRadius: 3,
        // Dashed all round and see-through: unmistakably the place it came
        // from rather than a second booking sitting there.
        ...(ghost
          ? {
              backgroundColor: "transparent",
              border: `1px dashed ${color}`,
              borderLeft: `2px dashed ${color}`,
              opacity: 0.55,
            }
          : {}),
      }}
    >
      {booking.notes && !ghost && <NoteBadge note={booking.notes} />}

      {compact ? (
        // A half-hour block is ~30px, and two stacked lines need more than
        // that — the name was being cut through the middle. Side by side
        // they fit, and the range still leads.
        <p className="flex items-baseline gap-1.5 truncate">
          <span className={`font-mono text-[11px] ${timeCls}`}>{shownTime}</span>
          <span className="truncate pr-3 text-xs font-medium text-zinc-200">{booking.customerName}</span>
          {booking.lessonLabel && (
            <span className="shrink-0 pr-3 font-mono text-[10px] text-[var(--color-accent)]">
              {booking.lessonLabel}
            </span>
          )}
        </p>
      ) : (
        <>
          <p className={`font-mono text-xs ${timeCls}`}>{shownTime}</p>
          <p className="truncate pr-3 text-xs font-medium text-zinc-200">{booking.customerName}</p>
          {(booking.serviceName || booking.lessonLabel) && (
            <p className="truncate text-[10px] text-zinc-500">
              {booking.serviceName}
              {booking.lessonLabel && (
                <span className="ml-1 font-mono text-[var(--color-accent)]">{booking.lessonLabel}</span>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );

  if (ghost) return body;

  return (
    <BookingManagementButton
      booking={booking}
      allStaff={allStaff}
      openOnMount={openOnMount}
      // touch-none here, not only on the wrapper: `touch-action` is not an
      // inherited property, and the finger lands on this button. With the
      // default `auto` the browser kept a claim on the gesture, so dragging a
      // booking on a phone fought the page for every millimetre and a press
      // that lingered turned into a text selection instead.
      //
      // cursor inherits on purpose: the wrapper switches between grab and
      // grabbing, and an open hand is what says "this can be picked up". The
      // pointing finger only promises a click, which was the whole story
      // before the block could be dragged.
      className="block h-full w-full touch-none select-none [-webkit-touch-callout:none] cursor-[inherit] text-left transition-colors hover:brightness-125"
    >
      {body}
    </BookingManagementButton>
  );
}
