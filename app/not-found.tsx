import Link from "next/link";

export const metadata = { title: "Nie znaleziono", robots: { index: false } };

/**
 * The 404 everything falls back to.
 *
 * There was none, so every miss — a mistyped booking address, an expired
 * demo link, a panel page a tenant's plan does not include — answered with
 * Next's built-in "This page could not be found." in English, on a white
 * page, with no way onward. A prospect clicking around a demo is exactly the
 * person most likely to land here.
 *
 * Deliberately says nothing about *why*. This page is reached by a wrong
 * address and by a capability a tenant does not have, and guessing between
 * them out loud would be wrong half the time.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-[var(--color-accent)]">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Nie ma tu nic do pokazania</h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-400">
        Ta strona nie istnieje albo nie jest już dostępna. Jeśli trafiłeś tu
        z linku, może być nieaktualny.
      </p>
      <Link
        href="/"
        className="mt-8 text-sm text-zinc-400 underline underline-offset-4 hover:text-zinc-200"
      >
        ← Wróć na stronę główną
      </Link>
    </main>
  );
}
