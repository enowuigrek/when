"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useViewportFit } from "./use-viewport-fit";

type Staff = { id: string; name: string; color: string };

/** A staff column's natural width, unless the caller says otherwise. */
const DEFAULT_COL = 180;

/**
 * One person at a time on a phone, for any of the panel's staff-column grids.
 *
 * At 375px these tables showed the frozen first column plus one and a half
 * staff columns, so you were always reading someone alongside a fragment of
 * the next person. Here each column is widened to fill the container and
 * scroll-snapped, and a strip of initials above tracks which one you are on.
 *
 * The strip navigates, it does not filter: picking a subset is meaningless
 * when only one column is visible at a time, so filtering stays a desktop
 * affordance and one tap has one meaning.
 *
 * Shared by the day schedule, the week schedule and the roster — all three are
 * days against people, and they only differ in how wide the frozen column is.
 * Wide enough for two whole columns, this renders its children unchanged.
 */
export function StaffCarousel({
  staff,
  gutter,
  col = DEFAULT_COL,
  fitViewport = true,
  children,
}: {
  staff: Staff[];
  /** Width of the frozen first column, so a snapped column lands beside it. */
  gutter: number;
  /** This grid's natural column width — the week view runs wider than the day. */
  col?: number;
  /** Cap the height to the viewport and scroll inside. Off for short tables. */
  fitViewport?: boolean;
  children: ReactNode;
}) {
  const CAROUSEL_BELOW = gutter + 2 * col;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(false);
  const [colW, setColW] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(staff[0]?.id ?? null);
  const viewportH = useViewportFit(scrollRef);
  const fitH = fitViewport ? viewportH : undefined;

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const on = staff.length > 1 && el.clientWidth < CAROUSEL_BELOW;
    setMobile(on);
    setColW(on ? Math.max(200, el.clientWidth - gutter) : 0);
  }, [staff.length, gutter, CAROUSEL_BELOW]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  /**
   * Keeps the strip in step with the swipe. The column width is known, so the
   * index falls straight out of scrollLeft. Bound as a React prop rather than
   * an effect + addEventListener: that version silently stopped updating once
   * the effect re-subscribed, and there is no reason to manage the listener
   * by hand.
   */
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (!mobile || !colW) return;
    const i = Math.min(staff.length - 1, Math.max(0, Math.round(e.currentTarget.scrollLeft / colW)));
    const next = staff[i];
    if (next && next.id !== activeId) setActiveId(next.id);
  }

  function jumpTo(id: string) {
    const el = scrollRef.current;
    if (!el) return;
    const th = el.querySelector<HTMLElement>(`th[data-staff-id="${id}"]`);
    if (!th) return;
    el.scrollTo({ left: th.offsetLeft - gutter, behavior: "smooth" });
    setActiveId(id);
  }

  const active = staff.find((s) => s.id === activeId) ?? staff[0];

  return (
    <div>
      {mobile && (
        <div className="mb-3">
          {/* Colour carries identity — initials collide (two K's in an eight
              person team), so the letter is only support and the full name of
              whoever you are on is spelled out below. */}
          <div className="flex items-center gap-2">
            {staff.map((s) => {
              const on = s.id === active?.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpTo(s.id)}
                  aria-label={s.name}
                  aria-current={on ? "true" : undefined}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: on ? s.color : `${s.color}26`,
                    color: on ? "#18181b" : s.color,
                    outline: on ? `2px solid ${s.color}` : "none",
                    outlineOffset: 2,
                  }}
                >
                  {s.name.charAt(0).toUpperCase()}
                </button>
              );
            })}
          </div>
          {active && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active.color }} />
              {active.name}
            </p>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="schedule-viewport overflow-x-auto rounded-xl border border-zinc-800/60"
        style={
          {
            scrollbarWidth: "thin",
            scrollbarColor: "#3f3f46 transparent",
            maxHeight: fitH,
            overflowY: fitH ? "auto" : undefined,
            scrollSnapType: mobile ? "x mandatory" : undefined,
            // Read by the table and its header cells; unset on desktop, where
            // the server-rendered widths apply as before.
            "--sched-col-w": colW ? `${colW}px` : undefined,
            "--sched-snap": mobile ? "start" : "none",
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}
