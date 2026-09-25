import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Błąd płatności",
  robots: { index: false },
};

export default function PaymentErrorPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-xl px-6 py-16 md:py-24">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/20 text-2xl text-red-400">
            ✕
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Płatność nieudana
          </h1>
          <p className="mt-3 text-zinc-400">
            Nie udało się zrealizować płatności. Rezerwacja nie została potwierdzona.
          </p>

          <div className="mt-8 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 space-y-2 text-sm text-zinc-400">
            <p>Co możesz zrobić:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Spróbuj ponownie — wróć i wybierz termin</li>
              <li>Skontaktuj się z salonem telefonicznie</li>
              <li>Jeśli środki zostały pobrane — skontaktuj się z bankiem</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
            >
              ← Strona główna
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
