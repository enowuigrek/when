"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { StaffAvatar } from "@/components/ui/staff-avatar";

export type ChipStaff = { id: string; name: string; color: string; photo_url?: string | null };

/**
 * The one staff chip. Used by the schedule filter and by the staff step of the
 * booking forms, which had grown two different looks: the schedule tinted the
 * chip in the person's own colour, the booking form went grey, so the same
 * choice felt like two features.
 *
 * Colour wins. A staff member already owns a colour everywhere else — their
 * column, their booking blocks — so selecting them should light up in it.
 *
 * Renders a link when given `href`, a button when given `onClick`.
 */
export function StaffChip({
  staff,
  selected,
  dimmed = false,
  count,
  href,
  onClick,
  title,
  children,
}: {
  /** Omit for the neutral "everyone" / "any" chip. */
  staff?: ChipStaff;
  selected: boolean;
  dimmed?: boolean;
  count?: number;
  href?: string;
  onClick?: () => void;
  title?: string;
  /** Label for the neutral chip. */
  children?: ReactNode;
}) {
  const base =
    "flex shrink-0 items-baseline gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors";

  const state = selected
    ? "text-zinc-100"
    : dimmed
    ? "border-zinc-800/60 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
    : "border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100";

  // Selected chips carry the person's colour rather than a generic highlight;
  // inline because the value is per-record and cannot be a utility class.
  const style =
    selected && staff
      ? { borderColor: staff.color, backgroundColor: `${staff.color}1a` }
      : selected
      ? undefined
      : undefined;

  const inner = (
    <>
      {staff && (
        <span className="self-center">
          <StaffAvatar photoUrl={staff.photo_url} color={staff.color} name={staff.name} size={18} />
        </span>
      )}
      {staff ? staff.name : children}
      {count !== undefined && count > 0 && (
        <span className="font-mono text-xs text-zinc-500">{count}</span>
      )}
    </>
  );

  const cls = `${base} ${state} ${selected && !staff ? "border-zinc-500 bg-zinc-800" : ""}`;

  if (href) {
    return (
      // next/link, not a bare anchor: an anchor reloads the whole document,
      // and the theme is only applied to <html> after hydration, so every
      // filter click flashed the default dark palette on its way back.
      <Link href={href} aria-current={selected ? "true" : undefined} title={title} className={cls} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={title}
      className={cls}
      style={style}
    >
      {inner}
    </button>
  );
}
