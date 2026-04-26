import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { logoutAction } from "./actions";
import { getSettings } from "@/lib/db/settings";
import { AdminNotificationBell } from "@/components/admin-notification-bell";
import { AdminMobileNav } from "@/components/admin-mobile-nav";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  const s = await getSettings();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-6">
          {/* Logo */}
          <Link href="/admin" className="shrink-0 text-base font-semibold tracking-tight">
            {s.business_name}
            <span className="text-[var(--color-accent)]">.</span>
            <span className="ml-1.5 text-xs font-normal uppercase tracking-widest text-zinc-500">
              panel
            </span>
          </Link>

          {/* Scrollable nav links — hidden on mobile, shown sm+ */}
          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm sm:flex">
            <NavLink href="/admin">Dziś</NavLink>
            <NavLink href="/admin/tydzien">Tydzień</NavLink>
            <NavLink href="/admin/harmonogram">Harmonogram</NavLink>
            <NavLink href="/admin/grafik">Grafik</NavLink>
            <span className="mx-2 h-4 w-px shrink-0 bg-zinc-700" />
            <NavLink href="/admin/uslugi">Usługi</NavLink>
            <NavLink href="/admin/pracownicy">Pracownicy</NavLink>
            <NavLink href="/admin/klienci">Klienci</NavLink>
            <NavLink href="/admin/ustawienia">Ustawienia</NavLink>
          </nav>

          {/* Fixed right side — outside overflow nav so dropdowns work */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Desktop: full label. Mobile: just "+" */}
            <Link
              href="/admin/rezerwacja/nowa"
              className="rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              <span className="hidden sm:inline">+ Rezerwacja</span>
              <span className="sm:hidden">+</span>
            </Link>
            <AdminNotificationBell />
            {/* Desktop: show Wyloguj inline. Mobile: in hamburger */}
            <form action={logoutAction} className="hidden sm:block">
              <button type="submit" className="px-2 py-1 text-zinc-500 hover:text-zinc-300 text-sm">
                Wyloguj
              </button>
            </form>
            <AdminMobileNav logoutAction={logoutAction} />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2.5 py-1.5 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
    >
      {children}
    </Link>
  );
}
