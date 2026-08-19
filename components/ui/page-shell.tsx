import type { ReactNode } from "react";

/**
 * The frame every panel page sits in.
 *
 * Sections had drifted to six different max-widths and two padding scales, so
 * the title jumped as you moved between them. One outer container fixes the
 * header in place; `narrow` then constrains the content of reading-width pages
 * — lists and settings — without moving the heading above them.
 */
export function PageShell({
  title,
  subtitle,
  actions,
  narrow = false,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Buttons that belong beside the title. */
  actions?: ReactNode;
  /** Constrain the body to a reading width. Schedules and the dashboard don't. */
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[100rem] px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>

      <div className={narrow ? "mt-6 max-w-4xl" : "mt-6"}>{children}</div>
    </section>
  );
}
