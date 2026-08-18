"use client";

import { useRef, type ReactNode } from "react";
import { useViewportFit } from "./use-viewport-fit";

/**
 * Scroll box for the week table. The day view gets the same treatment from
 * DayStaffCarousel, which already owns a ref for its horizontal snapping.
 */
export function WeekViewport({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const maxH = useViewportFit(ref);

  return (
    <div
      ref={ref}
      className="schedule-viewport overflow-x-auto rounded-xl border border-zinc-800/60"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "#3f3f46 transparent",
        maxHeight: maxH,
        overflowY: maxH ? "auto" : undefined,
      }}
    >
      {children}
    </div>
  );
}
