import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Polityka prywatności",
  description:
    "Informacja o przetwarzaniu danych osobowych w systemie WHEN (whenbooking.pl) zgodnie z art. 13 RODO.",
  alternates: { canonical: "/polityka-prywatnosci" },
  robots: { index: true, follow: true },
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-zinc-800/60 py-5">
      <dt className="text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className="mt-2 text-sm leading-relaxed text-zinc-300">{children}</dd>
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="when" className="h-9 logo-adaptive" />
          </Link>
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">
            ← Strona główna
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Polityka prywatności WHEN</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Informacja o przetwarzaniu danych osobowych <span className="text-zinc-400">(zgodnie z art. 13 RODO)</span>
        </p>

        <dl className="mt-10">
          <Row label="Administrator danych">
            Łukasz Nowak,{" "}
            <a
              href="mailto:kontakt@lukasznowak.dev"
              className="text-[var(--color-accent)] underline-offset-2 hover:underline"
            >
              kontakt@lukasznowak.dev
            </a>
          </Row>

          <Row label="Cel przetwarzania">
            Obsługa konta użytkownika w systemie WHEN (whenbooking.pl), w tym umożliwienie dostępu do
            panelu rezerwacji.
          </Row>

          <Row label="Podstawa prawna">
            Art. 6 ust. 1 lit. b RODO — przetwarzanie jest niezbędne do wykonania umowy (świadczenia
            usługi).
          </Row>

          <Row label="Zakres danych">
            Imię, nazwisko, adres e-mail, dane kontaktowe podane przy rejestracji.
          </Row>

          <Row label="Odbiorcy danych">
            Supabase Inc. — dostawca infrastruktury technicznej (podmiot przetwarzający), działający na
            podstawie standardowych klauzul umownych zgodnych z RODO.
          </Row>

          <Row label="Okres przechowywania">
            Przez czas korzystania z usługi, a po jej zakończeniu przez okres wymagany przepisami prawa
            lub do czasu przedawnienia ewentualnych roszczeń.
          </Row>

          <Row label="Twoje prawa">
            Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania,
            przenoszenia oraz wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych.
          </Row>
        </dl>
      </section>
    </main>
  );
}
