export function WidgetPoweredBy() {
  return (
    <footer className="border-t border-zinc-800/60 bg-zinc-950">
      <a
        href="https://whenbooking.pl"
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto flex h-12 max-w-3xl items-center justify-center gap-2 px-6 text-[10px] uppercase tracking-widest text-zinc-600 transition-colors hover:text-zinc-400"
      >
        <span>Powered by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="when" className="h-3.5 logo-adaptive opacity-60" />
      </a>
    </footer>
  );
}
