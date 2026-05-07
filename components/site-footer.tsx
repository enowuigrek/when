export async function SiteFooter() {
  return (
    <footer
      className="border-t border-zinc-800/60"
      style={{ backgroundColor: "var(--color-accent)" }}
    >
      <div className="mx-auto max-w-3xl px-6 py-5">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <a
            href="https://whenbooking.pl"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/70 hover:text-white transition-colors"
          >
            <span>Powered by</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="when" className="h-3 opacity-80" style={{ filter: "brightness(0) invert(1)" }} />
          </a>
          <div className="flex items-center gap-3 text-[11px] text-white/50">
            <span>© {new Date().getFullYear()}</span>
            <span className="h-3 w-px bg-white/20" />
            <a
              href="https://lukasznowak.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/80 transition-colors"
            >
              lukasznowak.dev
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
