import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Błąd", robots: { index: false } };

export default function CancelErrorPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-lg px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Nie można anulować</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Link jest nieważny, rezerwacja już minęła lub została wcześniej anulowana.
          </p>
          <div className="mt-8">
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
              ← Wróć na stronę główną
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
