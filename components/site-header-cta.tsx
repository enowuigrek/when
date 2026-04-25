"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeaderCta() {
  const pathname = usePathname();
  if (pathname.startsWith("/rezerwacja")) return null;
  return (
    <Link
      href="/rezerwacja"
      className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
    >
      Zarezerwuj
    </Link>
  );
}
