import type { ReactNode } from "react";
import { AdminLink } from "@/components/admin-link";

/**
 * One row in an admin list — staff, customers, and anything of that shape.
 *
 * Extracted because the two lists had drifted apart: staff were separate
 * bordered cards, customers were a single divided block, and they read as two
 * different products. This is the staff treatment, which is the one worth
 * keeping — a row of cards survives a long list better than hairlines, and
 * each row can hold its own actions without them looking bolted on.
 *
 * Pass `href` to make the whole row a link; otherwise it is a plain container
 * and the caller puts interactive controls in `right`.
 */
export function ListRow({
  avatar,
  title,
  subtitle,
  right,
  href,
  dimmed = false,
}: {
  avatar: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Actions, stats, a chevron — whatever belongs at the end of the row. */
  right?: ReactNode;
  href?: string;
  dimmed?: boolean;
}) {
  const shell = `flex items-center gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-4 sm:px-5 ${
    dimmed ? "opacity-50" : ""
  }`;

  const inner = (
    <>
      <span className="shrink-0">{avatar}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-zinc-100">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-sm text-zinc-500">{subtitle}</span>}
      </span>
      {right && <span className="flex shrink-0 items-center gap-2">{right}</span>}
    </>
  );

  if (href) {
    return (
      <AdminLink href={href} className={`${shell} transition-colors hover:border-zinc-700`}>
        {inner}
      </AdminLink>
    );
  }
  return <div className={shell}>{inner}</div>;
}

/** Wrapper that spaces rows apart, so callers do not each pick a gap. */
export function ListRows({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

/** Circle with an initial — the customer counterpart to StaffAvatar. */
export function InitialAvatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-800 font-semibold text-zinc-300"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
