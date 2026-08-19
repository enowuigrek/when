import type { ReactNode } from "react";
import { AdminLink } from "@/components/admin-link";
import { card, sectionHeading } from "@/components/ui/surface";

type Tone = "default" | "accent" | "warn" | "muted";

const TONE: Record<Tone, string> = {
  default: "text-zinc-100",
  accent: "text-[var(--color-accent)]",
  warn: "text-amber-400",
  // For a zero that is good news — no cancellations, no no-shows.
  muted: "text-zinc-700",
};

/**
 * A number with a label, on a card.
 *
 * There were three of these — the dashboard's, the customer profile's and the
 * staff profile's — differing in heading case, value size and which colour
 * flags they happened to need, so the same tile looked slightly different on
 * every page that used it.
 *
 * `href` turns the tile into a link, which is what the dashboard wants: the
 * number is usually the start of a question and the answer is one click away.
 */
export function StatTile({
  label,
  value,
  sub,
  tone = "default",
  size = "lg",
  href,
}: {
  label: string;
  value: ReactNode;
  /** A line under the value — what the number means, or where it leads. */
  sub?: string;
  tone?: Tone;
  /** `sm` for text values such as a service name, `lg` for counts. */
  size?: "sm" | "lg";
  href?: string;
}) {
  const body = (
    <>
      <p className={sectionHeading}>{label}</p>
      <p
        className={`mt-2 font-semibold ${size === "lg" ? "text-xl" : "text-sm"} ${TONE[tone]}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-zinc-600">{sub}</p>}
    </>
  );

  if (href) {
    return (
      <AdminLink href={href} className={`${card} block p-4 transition-colors hover:border-zinc-700`}>
        {body}
      </AdminLink>
    );
  }
  return <div className={`${card} p-4`}>{body}</div>;
}
