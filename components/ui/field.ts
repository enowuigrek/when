/**
 * The one form field style.
 *
 * Six near-identical class strings had grown across the panel — rounded-md
 * against rounded-lg, three different paddings, two spellings of the
 * placeholder colour — so the same input looked slightly different depending
 * on which form you had opened. Radius matches the button scale, so a field
 * and the button beside it share a corner.
 *
 * `sm` is for popovers and inline rows, where a full-size field would crowd
 * everything else out.
 */
export function fieldClasses({
  size = "md",
  className = "",
}: { size?: "sm" | "md"; className?: string } = {}): string {
  return [
    "w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100",
    "placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
    "disabled:cursor-not-allowed disabled:opacity-40",
    size === "sm" ? "px-2 py-1.5 text-sm" : "px-3 py-2 text-sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The label above a field. */
export const fieldLabel = "mb-1 block text-xs text-zinc-500";
