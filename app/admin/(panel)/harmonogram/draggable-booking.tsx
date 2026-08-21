"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { rescheduleBookingAction } from "../actions";
import { DragTimeContext } from "./drag-time-context";

/**
 * A booking you can shove up or down the day to move it.
 *
 * Press and hold, drag, let go: the block follows the pointer in five-minute
 * steps and the time on it updates as it moves, so the drop lands where the
 * clock says rather than where the pixels roughly are. A press that does not
 * move is still a click and still opens the management modal — the two have to
 * live on the same element, so a few pixels of slop decide which one happened.
 *
 * Nothing about the drag decides whether the move is allowed. The server holds
 * the overlap constraint, and a refused drop springs back with its reason.
 */
export function DraggableBooking({
  bookingId,
  date,
  startMinutes,
  durationMin,
  dayStartMinutes,
  dayEndMinutes,
  rowHeight,
  top,
  height,
  children,
}: {
  bookingId: string;
  /** The day being shown, YYYY-MM-DD — a drag never leaves it. */
  date: string;
  /** Minutes from midnight, Warsaw. */
  startMinutes: number;
  durationMin: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
  /** Pixels per half-hour row: the whole scale of the grid. */
  rowHeight: number;
  top: number;
  height: number;
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
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  /**
   * Hold the visual offset until the server's own answer arrives.
   *
   * Zeroing it the moment the save returns puts the block back where it was
   * for as long as the refreshed schedule takes to render — a visible bounce
   * back to the old time and then a jump to the new one. Instead the offset
   * stands until `startMinutes` comes back changed, at which point the block
   * is already drawn in the right place and dropping the offset moves nothing.
   * This is React's documented way of adjusting state when a prop changes.
   */
  const [lastStart, setLastStart] = useState(startMinutes);
  if (startMinutes !== lastStart) {
    setLastStart(startMinutes);
    setOffsetMin(0);
  }
  const [error, setError] = useState<string | null>(null);
  const startY = useRef(0);
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
      moved.current = false;
      pressed.current = false;
      offsetRef.current = 0;
      setDragging(false);
      setOffsetMin(0);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dragging]);

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
    startY.current = e.clientY;
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
    if (!moved.current && Math.abs(dy) < SLOP_PX) return;
    if (!moved.current) {
      moved.current = true;
      setDragging(true);
    }
    const next = clamp(Math.round(dy / pxPerMinute / STEP) * STEP);
    offsetRef.current = next;
    setOffsetMin(next);
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
      dragRoot.current?.querySelector("button")?.click();
      return;
    }
    justDragged.current = true;
    setDragging(false);

    const delta = offsetRef.current;
    if (delta === 0) return;

    setSaving(true);
    const fd = new FormData();
    fd.set("id", bookingId);
    fd.set("date", date);
    fd.set("time", hhmm(startMinutes + delta));
    const res = await rescheduleBookingAction(fd);
    setSaving(false);

    if (res.ok) {
      // Offset deliberately left standing — see `lastStart` above.
      startTransition(() => router.refresh());
    } else {
      offsetRef.current = 0;
      setOffsetMin(0);
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
      onPointerCancel={() => { pressed.current = false; offsetRef.current = 0; setDragging(false); setOffsetMin(0); }}
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

      {dragging && offsetMin !== 0 && (
        // Where it was picked up from, drawn by cancelling the wrapper's own
        // offset so it stays pinned to the original time while the block moves.
        // Without it the old time is gone the moment you start dragging, and
        // putting the booking back means guessing.
        <div
          className="pointer-events-none absolute inset-x-0 rounded border border-dashed border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5"
          style={{ top: -offsetMin * pxPerMinute, height }}
        >
          <span className="absolute left-1 top-0.5 font-mono text-[10px] text-[var(--color-accent)]/70">
            {hhmm(startMinutes)}
          </span>
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
