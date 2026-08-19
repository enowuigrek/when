import type { ReactNode } from "react";

/**
 * What a section says when there is nothing in it yet.
 *
 * This is the first thing a new account shows — a pre-provisioned demo has no
 * services and nobody on the books until someone adds them — so an empty table
 * with a header and no rows is the worst possible first impression. It should
 * say what is missing and where to add it.
 */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  /** A link to the place this gets fixed. */
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 px-5 py-10 text-center">
      <p className="text-sm text-zinc-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-zinc-500">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
