const box = "rounded-xl border border-zinc-800/60 bg-zinc-900/40";

/**
 * Shown the instant any panel page is opened, until it has rendered.
 *
 * Every page here is rendered on the server per request, and some — the
 * schedule, a new entry — take a moment. Without a fallback the old screen
 * simply stayed put for that moment, with nothing to say the tap had landed.
 * The sidebar belongs to the layout above this boundary, so it stays where it
 * is; only the content area is swapped for the bar and a quiet outline of a
 * page. Pages with a shape worth mirroring (rezerwacja/nowa) keep their own.
 */
export default function Loading() {
  return (
    <>
      <div className="page-loading-bar" role="progressbar" aria-label="Wczytywanie strony" />
      <section className="mx-auto max-w-[100rem] px-4 py-8 sm:px-6" aria-busy="true">
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-zinc-800/60" />
          <div className="mt-2 h-4 w-32 rounded bg-zinc-800/40" />
          <div className="mt-8 space-y-4">
            <div className={`h-24 ${box}`} />
            <div className={`h-40 ${box}`} />
            <div className={`h-24 ${box}`} />
          </div>
        </div>
      </section>
    </>
  );
}
