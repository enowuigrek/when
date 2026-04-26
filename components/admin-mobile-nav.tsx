"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/admin", label: "Dziś" },
  { href: "/admin/tydzien", label: "Tydzień" },
  { href: "/admin/harmonogram", label: "Harmonogram" },
  { href: "/admin/grafik", label: "Grafik" },
  { href: "/admin/uslugi", label: "Usługi" },
  { href: "/admin/pracownicy", label: "Pracownicy" },
  { href: "/admin/klienci", label: "Klienci" },
  { href: "/admin/ustawienia", label: "Ustawienia" },
];

export function AdminMobileNav({ logoutAction }: { logoutAction: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
        aria-label="Menu"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="3" x2="15" y2="15" />
            <line x1="15" y1="3" x2="3" y2="15" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="5" x2="15" y2="5" />
            <line x1="3" y1="9" x2="15" y2="9" />
            <line x1="3" y1="13" x2="15" y2="13" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-zinc-800 bg-zinc-950 py-2 shadow-xl">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
            >
              {label}
            </Link>
          ))}
          <div className="mx-3 my-2 border-t border-zinc-800" />
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full px-4 py-2.5 text-left text-sm text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
            >
              Wyloguj
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
