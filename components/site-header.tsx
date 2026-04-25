import Link from "next/link";
import { business } from "@/lib/business";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {business.name}
          <span className="text-[var(--color-accent)]">.</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a href="#uslugi" className="hover:text-zinc-100">Usługi</a>
          <a href="#godziny" className="hover:text-zinc-100">Godziny</a>
          <a href="#kontakt" className="hover:text-zinc-100">Kontakt</a>
        </nav>

        <Link
          href="/rezerwacja"
          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Zarezerwuj
        </Link>
      </div>
    </header>
  );
}
