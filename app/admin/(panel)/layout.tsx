import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { logoutAction } from "./actions";
import { business } from "@/lib/business";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/admin" className="text-lg font-semibold tracking-tight">
            {business.name}
            <span className="text-[var(--color-accent)]">.</span>
            <span className="ml-2 text-xs font-normal uppercase tracking-widest text-zinc-500">
              panel
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="text-zinc-300 hover:text-zinc-100">
              Dziś
            </Link>
            <Link
              href="/admin/tydzien"
              className="text-zinc-300 hover:text-zinc-100"
            >
              Tydzień
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-zinc-500 hover:text-zinc-300"
              >
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
