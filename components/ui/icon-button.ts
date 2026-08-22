/**
 * The one hit target for a bare icon control — a close ×, a dismiss, a chevron.
 *
 * These were sized by their glyph: a 16px × in a box the size of a 16px ×,
 * which a mouse hits every time and a thumb misses. Apple asks for 44pt and
 * Material for 48dp; 44 is the floor here, applied on every screen rather than
 * only on phones, because a control that is easy to hit with a thumb is not
 * harder to hit with a pointer.
 *
 * The glyph keeps its own size. This only grows the area around it, so nothing
 * in the layout gets visually heavier — `-m-*` pulls the extra area back out
 * of the flow where a control sits tight against an edge.
 */
export function iconButtonClasses(className = ""): string {
  return [
    "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center",
    "rounded-lg transition-colors",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
