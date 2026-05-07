"use client";

/**
 * Reusable toggle/switch component.
 *
 * Track: h-6 w-11 (24×44px)
 * Thumb: h-5 w-5  (20×20px)
 * Padding: 2px each side
 * Off: thumb at left=2px
 * On:  thumb at left=22px  (44 - 20 - 2 = 22)
 *      → translate from left-[2px] by 20px = translate-x-5
 */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full p-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 ${
        checked ? "bg-[var(--color-accent)]" : "bg-zinc-500/60"
      }`}
    >
      <span
        className={`pointer-events-none absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[20px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
