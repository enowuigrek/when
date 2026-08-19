import type { ReactNode } from "react";

/**
 * The frame every panel page sits in.
 *
 * Sections had drifted to six different max-widths and two padding scales, so
 * the title jumped as you moved between them. One outer container fixes the
 * header in place; `narrow` then constrains reading-width pages — lists,
 * settings, a customer's profile — to a single measure.
 *
 * `narrow` wraps the header along with the body, not just the body. Holding the
 * heading to the full width while the content sat at a quarter of it left the
 * action button stranded 500px to the right of the cards it belonged to. The
 * heading itself does not move: it is aligned to the left edge either way.
 */
export function PageShell({
  title,
  subtitle,
  leading,
  back,
  actions,
  narrow = false,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Sits left of the title — an avatar, a status dot. */
  leading?: ReactNode;
  /** A link back to the list this page came from, above the heading. */
  back?: ReactNode;
  /** Buttons that belong beside the title. */
  actions?: ReactNode;
  /** Constrain the page to a reading width. Schedules and the dashboard don't. */
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[100rem] px-4 py-8 sm:px-6">
      <div className={narrow ? "max-w-4xl" : undefined}>
        {back && <div className="mb-4">{back}</div>}

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {leading && <div className="shrink-0">{leading}</div>}
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle && <div className="mt-1 text-sm text-zinc-500">{subtitle}</div>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>

        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
