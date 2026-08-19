import Link from "next/link";
import type { DemoOverview } from "@/lib/db/super-admin";
import { CopyLinkButton } from "./copy-link-button";

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} godz. temu`;
  return `${Math.floor(hours / 24)} dni temu`;
}

/**
 * The demos, and whether anyone has opened them.
 *
 * Trials come first: those are the ones sent to a named prospect and they do
 * not expire. The counts underneath are what the demo currently contains —
 * a demo with no services is not ready to send, and that should be visible
 * here rather than discovered by the person who receives the link.
 */
export function DemoList({ demos, origin }: { demos: DemoOverview[]; origin: string }) {
  const toSend = demos.filter((d) => d.kind === "trial");
  const generated = demos.filter((d) => d.kind === "demo");

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-400">Dema do wysłania</h2>
        <p className="text-xs text-zinc-600">
          Odwiedziny liczone bez ciasteczek i bez danych osobowych — sama liczba wejść i stron.
        </p>
      </div>

      {toSend.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-5 py-8 text-center text-sm text-zinc-500">
          Brak dem przygotowanych do wysyłki.
        </p>
      ) : (
        <ul className="space-y-2">
          {toSend.map((d) => (
            <DemoRow key={d.id} demo={d} origin={origin} />
          ))}
        </ul>
      )}

      {generated.length > 0 && (
        <details className="group mt-6">
          <summary className="cursor-pointer list-none text-xs text-zinc-500 hover:text-zinc-300">
            <span className="group-open:hidden">▸ Dema z landing page ({generated.length})</span>
            <span className="hidden group-open:inline">▾ Dema z landing page ({generated.length})</span>
          </summary>
          <ul className="mt-3 space-y-2">
            {generated.map((d) => (
              <DemoRow key={d.id} demo={d} origin={origin} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function DemoRow({ demo: d, origin }: { demo: DemoOverview; origin: string }) {
  const url = `${origin}/demo/${d.slug}`;
  const pusty = d.services === 0 || d.staff === 0;

  return (
    <li className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/wszystko/${d.id}`} className="text-sm font-medium text-zinc-100 hover:text-[var(--color-accent)]">
              {d.businessName}
            </Link>
            {d.kind === "trial" && (
              <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                bezterminowe
              </span>
            )}
            {pusty && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                niegotowe — brak {d.services === 0 ? "usług" : "pracowników"}
              </span>
            )}
          </div>
          <p className="mt-1 truncate font-mono text-xs text-zinc-500">{url}</p>
          <p className="mt-1 font-mono text-xs text-zinc-600">
            {d.services} usług · {d.staff} prac. · {d.bookings} rez.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <CopyLinkButton url={url} />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500"
          >
            ↗ Otwórz
          </a>
        </div>
      </div>

      <div className="mt-3 border-t border-zinc-800/60 pt-3">
        {d.views === 0 ? (
          <p className="text-xs text-zinc-600">Nikt jeszcze nie otworzył.</p>
        ) : (
          <p className="text-xs text-zinc-400">
            <span className="font-medium text-zinc-200">{d.views}</span> wejść ·{" "}
            <span className="font-medium text-zinc-200">{d.pagesSeen}</span>{" "}
            {d.pagesSeen === 1 ? "strona" : "stron"}
            {d.pagesSeen === 1 && <span className="text-zinc-600"> (tylko pierwszy ekran)</span>}
            {d.lastSeenAt && <span className="text-zinc-600"> · ostatnio {ago(d.lastSeenAt)}</span>}
          </p>
        )}
      </div>
    </li>
  );
}
