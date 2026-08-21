"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { rescheduleBookingAction } from "../actions";
import { DragTimeContext } from "./drag-time-context";
import { UNASSIGNED_COLUMN } from "./columns";

/**
 * A booking you can shove around the day to move it.
 *
 * Press and hold, drag, let go. Up and down changes the hour in five-minute
 * steps; sideways hands it to whoever owns the column you drop it on. The time
 * on the card updates as it moves, so the drop lands where the clock says
 * rather than where the pixels roughly are. A press that does not move is
 * still a click and still opens the management modal — the two share one
 * element, so a few pixels of slop decide which one happened.
 *
 * Nothing about the drag decides whether the move is allowed. The server holds
 * the overlap constraint, and a refused drop springs back with its reason.
 */
export function DraggableBooking({
  bookingId,
  date,
  staffId,
  startMinutes,
  durationMin,
  dayStartMinutes,
  dayEndMinutes,
  rowHeight,
  top,
  height,
  ghost,
  children,
}: {
  bookingId: string;
  /** The day being shown, YYYY-MM-DD — a drag never leaves it. */
  date: string;
  /** Whose column this sits in now; null in the "Bez pracownika" one. */
  staffId: string | null;
  /** Minutes from midnight, Warsaw. */
  startMinutes: number;
  durationMin: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
  /** Pixels per half-hour row: the whole scale of the grid. */
  rowHeight: number;
  top: number;
  height: number;
  /** The same card drawn flat, left behind at the time it was picked up from. */
  ghost: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [offsetMin, setOffsetMin] = useState(0);
  /**
   * The same number the state holds, kept where the release can read it.
   *
   * A quick flick can deliver pointerup before React has re-rendered from the
   * last pointermove, and the handler would then close over a stale offset —
   * usually zero, which reads as "nothing moved" and drops the whole drag on
   * the floor without a word. State drives the rendering; this drives the save.
   */
  const offsetRef = useRef(0);
  /** Which column the pointer is over, and how far sideways that is. */
  const [column, setColumn] = useState<{ staffId: string | null; dx: number } | null>(null);
  const columnRef = useRef<{ staffId: string | null; dx: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  /**
   * Hold the visual offset until the server's own answer arrives.
   *
   * Zeroing it the moment the save returns puts the block back where it was
   * for as long as the refreshed schedule takes to render — a visible bounce
   * back to the old time and then a jump to the new one. Instead the offset
   * stands until the server's own values come back changed, at which point the block
   * is already drawn in the right place and dropping the offset moves nothing.
   * This is React's documented way of adjusting state when a prop changes.
   */
  const [lastMove, setLastMove] = useState({ startMinutes, staffId });
  if (startMinutes !== lastMove.startMinutes || staffId !== lastMove.staffId) {
    setLastMove({ startMinutes, staffId });
    setOffsetMin(0);
    setColumn(null);
    columnRef.current = null;
  }
  const [error, setError] = useState<string | null>(null);
  const startY = useRef(0);
  const startX = useRef(0);
  const moved = useRef(false);
  const pressed = useRef(false);
  const dragRoot = useRef<HTMLDivElement>(null);
  /**
   * Set the moment a drag ends, so the click the browser fires straight after
   * it is swallowed. Cleared on the next press rather than by the click that
   * consumes it: a drag does not always produce a click, and a flag left
   * standing would eat the next genuine one instead.
   */
  const justDragged = useRef(false);

  /**
   * Escape abandons a drag in progress.
   *
   * Changing your mind halfway through is the common case — you pick a booking
   * up, look at where it would go, and decide it was fine where it was. Without
   * a way out you have to aim it back at its old time by eye, which is a worse
   * job than the move itself. A confirmation dialog on every drop would charge
   * every deliberate move for the rare regretted one; this charges nothing.
   */
  useEffect(() => {
    if (!dragging) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      abandon();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dragging]);

  /**
   * Where each column starts and ends, taken from the header row.
   *
   * `table-layout: fixed` means the header cells share the body's geometry
   * exactly, and the header is one row rather than one per half-hour — so this
   * is both cheaper and steadier than measuring the cell under the pointer,
   * which during a drag is the dragged block itself.
   */
  function columnBounds() {
    const table = dragRoot.current?.closest("table");
    if (!table) return [];
    return [...table.querySelectorAll<HTMLElement>("thead th[data-col-staff]")].map((th) => {
      const r = th.getBoundingClientRect();
      const id = th.dataset.colStaff ?? "";
      return { staffId: id === UNASSIGNED_COLUMN ? null : id, left: r.left, right: r.right };
    });
  }

  /** The card's own button — the only thing in here that is a drag handle. */
  function cardButton(): HTMLButtonElement | null {
    return dragRoot.current?.querySelector(":scope > button") ?? null;
  }

  /**
   * Put everything back as it was and save nothing.
   *
   * Escape and a cancelled pointer are the same event as far as the block is
   * concerned, and they used to unwind different halves of the state: the
   * sideways offset was left standing by both, so abandoning a drag that had
   * crossed into another person's column left the block sitting over that
   * column while belonging to the old one.
   */
  function abandon() {
    moved.current = false;
    pressed.current = false;
    offsetRef.current = 0;
    columnRef.current = null;
    setDragging(false);
    setOffsetMin(0);
    setColumn(null);
  }

  const pxPerMinute = rowHeight / 30;
  const STEP = 5;
  /** Under this, it was a click with a shaky hand, not a drag. */
  const SLOP_PX = 4;

  function clamp(deltaMin: number) {
    const first = dayStartMinutes - startMinutes;
    const last = dayEndMinutes - durationMin - startMinutes;
    return Math.max(first, Math.min(last, deltaMin));
  }

  function onPointerDown(e: React.PointerEvent) {
    // Left button only; let a right-click open the context menu.
    if (e.button !== 0 || saving) return;
    // The management modal renders inside this wrapper, so its backdrop and
    // every control in it would otherwise start a phantom drag of the booking
    // underneath — and the release would forward the click to the card, which
    // reopens the modal the × had just closed. Only the card itself drags.
    const handle = cardButton();
    if (!handle || !handle.contains(e.target as Node)) return;
    startY.current = e.clientY;
    startX.current = e.clientX;
    moved.current = false;
    justDragged.current = false;
    pressed.current = true;
    offsetRef.current = 0;
    setError(null);
    // Capture from the press, not from the first move: the block is only as
    // tall as the booking, so a quick flick's first move can already be past
    // its edge, and without capture that move goes to whatever is underneath
    // and the drag never starts. The cost is that the browser then fires the
    // click on this wrapper instead of the button inside it — handled on
    // release, where a gesture that never moved hands the click over itself.
    // Capture can throw if the pointer is already gone by the time this runs;
    // losing it means a jumpier drag, not a broken card, so it must not take
    // the handler down with it.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no capture, still draggable */ }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pressed.current) return;
    const dy = e.clientY - startY.current;
    const dx = e.clientX - startX.current;
    if (!moved.current && Math.abs(dy) < SLOP_PX && Math.abs(dx) < SLOP_PX) return;
    if (!moved.current) {
      moved.current = true;
      setDragging(true);
    }
    const next = clamp(Math.round(dy / pxPerMinute / STEP) * STEP);
    offsetRef.current = next;
    setOffsetMin(next);

    // Sideways means a different person doing it. The block snaps to whole
    // columns rather than following the pointer freely: half a booking
    // straddling two people says nothing about where it would land.
    const bounds = columnBounds();
    const own = bounds.find((c) => c.staffId === staffId);
    const over = bounds.find((c) => e.clientX >= c.left && e.clientX < c.right);
    const nextColumn =
      own && over && over.staffId !== staffId
        ? { staffId: over.staffId, dx: over.left - own.left }
        : null;
    // Objects are rebuilt every move; compare the values or every single move
    // would re-render the whole block.
    if (nextColumn?.staffId !== columnRef.current?.staffId) {
      columnRef.current = nextColumn;
      setColumn(nextColumn);
    }
  }

  async function onPointerUp(e: React.PointerEvent) {
    pressed.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch { /* already released */ }
    if (!moved.current) {
      // Pointer capture means the click will be delivered here rather than to
      // the button, so pass it on: a press that did not move is a click and
      // still opens the management modal.
      cardButton()?.click();
      return;
    }
    justDragged.current = true;
    setDragging(false);

    const delta = offsetRef.current;
    const targetColumn = columnRef.current;
    if (delta === 0 && !targetColumn) return;

    setSaving(true);
    const fd = new FormData();
    fd.set("id", bookingId);
    fd.set("date", date);
    fd.set("time", hhmm(startMinutes + delta));
    // Sent only when the column changed: the action leaves the staff member
    // alone when the field is absent, and an unchanged one must not read as
    // a reassignment in the notification.
    if (targetColumn) fd.set("staffId", targetColumn.staffId ?? "");
    const res = await rescheduleBookingAction(fd);
    setSaving(false);

    if (res.ok) {
      // Offsets deliberately left standing — see `lastMove` above.
      startTransition(() => router.refresh());
    } else {
      offsetRef.current = 0;
      columnRef.current = null;
      setOffsetMin(0);
      setColumn(null);
      setError(res.message);
      // Long enough to read after looking away at the spot you were aiming for.
      setTimeout(() => setError(null), 6000);
    }
  }

  const shownStart = startMinutes + offsetMin;

  return (
    <div
      ref={dragRoot}
      className="absolute inset-x-2"
      style={{
        top: top + offsetMin * pxPerMinute,
        height,
        // Sideways is a transform, not a left offset: the block belongs to its
        // own column's cell, and moving it out of that cell any other way
        // would have it reflow inside a table it is only floating above.
        transform: column ? `translateX(${column.dx}px)` : undefined,
        // Without this the browser claims a vertical drag for scrolling on a
        // phone and the pointer events stop arriving mid-gesture.
        touchAction: "none",
        // A press-and-hold on a phone otherwise starts a text selection or the
        // callout menu, and the drag turns into a fight with the browser.
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        cursor: dragging ? "grabbing" : "grab",
        zIndex: dragging || saving ? 30 : undefined,
        opacity: saving ? 0.6 : 1,
        transition: dragging ? "none" : "top 120ms ease-out",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={abandon}
      onClickCapture={(e) => {
        if (justDragged.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {/* The card reads the dragged time off this while the gesture runs, so
          the clock in its corner is the readout. Kept live during the save too:
          the block stays where it was dropped until the server confirms, and
          its time should not flip back to the old one in the meantime. */}
      <DragTimeContext.Provider
        value={dragging || saving ? `${hhmm(shownStart)} – ${hhmm(shownStart + durationMin)}` : null}
      >
        {children}
      </DragTimeContext.Provider>

      {dragging && (offsetMin !== 0 || column) && (
        // Where it was picked up from: the whole card again, drawn flat, and
        // pinned to the original spot by cancelling both of the wrapper's own
        // offsets. A bare start time was not enough to answer the question you
        // actually ask mid-drag — whether this is the booking you meant to
        // move — and with columns in play it also has to hold its old column.
        <div
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: -offsetMin * pxPerMinute,
            height,
            transform: column ? `translateX(${-column.dx}px)` : undefined,
          }}
        >
          {ghost}
        </div>
      )}

      {/* Sits inside the block, not above it: the schedule scrolls sideways,
          which clips its vertical overflow too, and anything hovering over the
          top edge would be cut off for the first booking of the day. */}
      {error && (
        <span className="pointer-events-none absolute inset-x-1 top-1 z-10 truncate rounded-md border border-red-500/50 bg-zinc-950 px-1.5 py-0.5 text-xs text-red-300 shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}

function hhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
