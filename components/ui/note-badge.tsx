"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

const TIP_W = 260;

/**
 * A corner mark on a booking that carries a note, with the note on hover.
 *
 * Notes were invisible until you opened a booking, so the one detail that says
 * "there is something you need to know about this appointment" — a door code, a
 * warning, a preference — only reached you if you happened to click. The mark
 * puts that on the card itself.
 *
 * The bubble goes through a portal rather than sitting beside the mark. Booking
 * cards live inside a grid that scrolls in both axes and dim under a
 * `brightness` filter on hover, and a filter makes its element the containing
 * block for anything fixed inside it — so an in-place tooltip would be either
 * clipped by the scroller or anchored to the wrong box.
 *
 * Hover only, by design: on a phone a tap opens the booking, where the note is
 * written out in full.
 */
export function NoteBadge({ note }: { note: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function show() {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Clamped to the viewport: these cards sit in the rightmost column as
    // often as not, and the note can run to several lines.
    const left = Math.min(Math.max(8, r.right - TIP_W), window.innerWidth - TIP_W - 8);
    const below = r.bottom + 6;
    const top = below + 120 > window.innerHeight ? Math.max(8, r.top - 126) : below;
    setPos({ top, left });
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        aria-label={`Notatka: ${note}`}
        className="pointer-events-auto absolute right-1 top-1 text-zinc-400 transition-colors hover:text-zinc-100"
      >
        {/* A page with two written lines — small enough not to crowd a
            half-hour block, distinct enough not to read as a dot. */}
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3.5 1.5h6.3L13 4.7v9.8H3.5V1.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M9.4 1.8v3.3H12.7M6 8.5h4M6 11h2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>

      {pos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[500] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs leading-relaxed text-zinc-200 shadow-xl"
            style={{ top: pos.top, left: pos.left, width: TIP_W }}
          >
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Notatka</p>
            <p className="whitespace-pre-wrap break-words">{note}</p>
          </div>,
          document.body
        )}
    </>
  );
}
