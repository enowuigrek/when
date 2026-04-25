import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { logoutAction } from "./actions";
import { getSettings } from "@/lib/db/settings";

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

          <nav className="flex items-center gap-1 text-sm overflow-x-auto">
            {/* Widoki */}
            <NavLink href="/admin">Dziś</NavLink>
            <NavLink href="/admin/tydzien">Tydzień</NavLink>

            {/* Separator */}
            <span className="mx-2 h-4 w-px shrink-0 bg-zinc-700" />

            {/* Zarządzanie */}
            <NavLink href="/admin/uslugi">Usługi</NavLink>
            <NavLink href="/admin/pracownicy">Pracownicy</NavLink>
            <NavLink href="/admin/klienci">Klienci</NavLink>
            <NavLink href="/admin/ustawienia">Ustawienia</NavLink>

            {/* Separator */}
            <span className="mx-2 h-4 w-px shrink-0 bg-zinc-700" />

            {/* CTA + logout */}
            <Link
              href="/admin/rezerwacja/nowa"
              className="shrink-0 rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              + Rezerwacja
            </Link>
            <form action={logoutAction} className="ml-1">
              <button type="submit" className="text-zinc-500 hover:text-zinc-300 px-2 py-1">
                Wyloguj
              </button>
            </form>
          </nav>
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
