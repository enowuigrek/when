"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { StaffAvatar } from "@/components/ui/staff-avatar";
import { LinkPendingWash } from "@/components/ui/link-pending";

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
  // items-center, not items-baseline: baseline alignment let the 18px avatar
  // push the flex line's descender space, making a staff chip 41px tall next
  // to a 38px "everyone" chip in the same row, with the name sitting 2px above
  // centre. The count keeps its baseline inside its own span instead.
  const base =
    "relative flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors";

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
        <StaffAvatar photoUrl={staff.photo_url} color={staff.color} name={staff.name} size={18} />
      )}
      {/* Name and count share one line box so the smaller number sits on the
          name's baseline rather than floating against the chip's centre. */}
      <span className="flex items-baseline gap-2">
        {staff ? staff.name : children}
        {count !== undefined && count > 0 && (
          <span className="font-mono text-xs text-zinc-500">{count}</span>
        )}
      </span>
    </>
  );

  const cls = `${base} ${state} ${selected && !staff ? "border-zinc-600 bg-zinc-800" : ""}`;

  if (href) {
    return (
      // next/link, not a bare anchor: an anchor reloads the whole document,
      // and the theme is only applied to <html> after hydration, so every
      // filter click flashed the default dark palette on its way back.
      <Link href={href} aria-current={selected ? "true" : undefined} title={title} className={cls} style={style}>
        {inner}
        <LinkPendingWash />
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
