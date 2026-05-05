import Link from "next/link";
import { getSettings } from "@/lib/db/settings";
import { SiteHeaderCta } from "./site-header-cta";

export async function SiteHeader() {
  const s = await getSettings();
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/rezerwacja" className="text-lg font-semibold tracking-tight">
          {s.business_name}
          <span className="text-[var(--color-accent)]">.</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <Link href="/rezerwacja" className="hover:text-zinc-100 transition-colors">Usługi</Link>
          <Link href="/godziny" className="hover:text-zinc-100 transition-colors">Godziny</Link>
          <Link href="/kontakt" className="hover:text-zinc-100 transition-colors">Kontakt</Link>
        </nav>

        <SiteHeaderCta />
      </div>
    </header>
  );
}
