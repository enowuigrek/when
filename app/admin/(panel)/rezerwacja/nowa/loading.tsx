import { PageShell } from "@/components/ui/page-shell";

const box = "rounded-lg border border-zinc-800/60 bg-zinc-900/40";

/**
 * Shown the instant "Nowa rezerwacja" is tapped.
 *
 * This page is the slowest in the panel: it loads services, hours, settings,
 * time filters and staff, and only then can it work out the free slots for the
 * first open day. Without a fallback the old screen simply sat there for the
 * whole of that, which reads as a tap that missed — and the usual reaction is
 * to tap again.
 *
 * It mirrors the real page's frame, so the header does not move when the
 * content arrives.
 */
export default function Loading() {
  return (
    <PageShell narrow title="Nowa rezerwacja" subtitle="Rezerwacja przez telefon lub wizytę osobistą.">
      <div className="animate-pulse space-y-8">
        <section>
          <div className="mb-3 h-3 w-20 rounded bg-zinc-800/60" />
          <div className={`h-10 ${box}`} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className={`h-10 ${box}`} />
            <div className={`h-10 ${box}`} />
          </div>
        </section>

        <section>
          <div className="mb-3 h-3 w-20 rounded bg-zinc-800/60" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-20 ${box}`} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 h-3 w-24 rounded bg-zinc-800/60" />
          <div className={`h-[22rem] max-w-[26rem] ${box}`} />
        </section>
      </div>
    </PageShell>
  );
}
