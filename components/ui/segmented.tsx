import Link from "next/link";

/**
 * The panel's segmented control — the Dzień/Tydzień switch, generalised.
 *
 * Links rather than buttons, so the choice lives in the URL and the server
 * renders the right half. That keeps a tab shareable and survives a reload,
 * and it is how the schedule already worked; this only stops the next place
 * that needs one from drawing its own.
 */
export function Segmented<T extends string>({
  options,
  value,
  hrefFor,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  hrefFor: (value: T) => string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 p-1">
      {options.map((o) => (
        <Link
          key={o.value}
          href={hrefFor(o.value)}
          aria-current={o.value === value ? "true" : undefined}
          className={`flex items-baseline gap-1.5 rounded-md px-3.5 py-1 text-sm font-medium transition-colors ${
            o.value === value ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {o.label}
          {o.count !== undefined && o.count > 0 && (
            <span className="font-mono text-xs text-zinc-500">{o.count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
