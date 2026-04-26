"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  // Exact match for /admin, prefix match for all others
  const active = href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin?") : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}
