import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Rezerwacja anulowana", robots: { index: false } };

export default function CancelConfirmedPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-lg px-6 py-16 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-2xl">
            ✓
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Rezerwacja anulowana</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Twoja rezerwacja została anulowana. Zapraszamy ponownie!
          </p>
          <div className="mt-8">
            <Link
              href="/rezerwacja"
              className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Zarezerwuj ponownie
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
