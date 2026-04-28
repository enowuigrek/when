import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { logoutAction } from "./actions";
import { getSettings } from "@/lib/db/settings";
import { getAdminTenantId } from "@/lib/tenant";
import { AdminNotificationBell } from "@/components/admin-notification-bell";
import { AdminMobileNav } from "@/components/admin-mobile-nav";
import { AdminNavLink } from "@/components/admin-nav-link";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  const [s, tenantId] = await Promise.all([getSettings(), getAdminTenantId()]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-6">
          {/* Logo */}
          <Link href="/admin" className="shrink-0 leading-tight">
            <span className="text-base font-semibold tracking-tight">
              {s.business_name}<span className="text-[var(--color-accent)]">.</span>
            </span>
            <span className="block text-[10px] font-normal uppercase tracking-widest text-zinc-500">
              panel
            </span>
          </Link>

          {/* Scrollable nav links — hidden on mobile, shown sm+ */}
          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm sm:flex">
            <AdminNavLink href="/admin/harmonogram">Harmonogram</AdminNavLink>
            <AdminNavLink href="/admin/grafik">Grafik</AdminNavLink>
            <span className="mx-2 h-4 w-px shrink-0 bg-zinc-700" />
            <AdminNavLink href="/admin/uslugi">Usługi</AdminNavLink>
            <AdminNavLink href="/admin/pracownicy">Pracownicy</AdminNavLink>
            <AdminNavLink href="/admin/klienci">Klienci</AdminNavLink>
            <AdminNavLink href="/admin/ustawienia">Ustawienia</AdminNavLink>
          </nav>

          {/* Fixed right side — outside overflow nav so dropdowns work */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Desktop: full label. Mobile: just "+" */}
            <Link
              href="/admin/rezerwacja/nowa"
              className="rounded-full bg-[var(--color-accent)] text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] sm:px-3 sm:py-1.5 sm:text-xs sm:font-medium flex h-8 w-8 items-center justify-center sm:h-auto sm:w-auto"
            >
              <span className="hidden sm:inline">+ Rezerwacja</span>
              <span className="sm:hidden text-base font-medium leading-none">+</span>
            </Link>
            <AdminNotificationBell tenantId={tenantId} />
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

