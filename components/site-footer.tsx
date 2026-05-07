export async function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800/60 bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-6 text-sm text-zinc-500">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <a
            href="https://whenbooking.pl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Powered by WHEN
          </a>
          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span>© {new Date().getFullYear()}</span>
            <span className="h-3 w-px bg-zinc-800" />
            <a
              href="https://lukasznowak.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              lukasznowak.dev
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
