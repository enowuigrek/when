import Link from "next/link";
import type { ReactNode } from "react";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { GlowCursor } from "@/components/glow-cursor";
import { ThemeApplier } from "@/components/theme-applier";

export const metadata = {
  title: "WHEN — system rezerwacji online",
  description:
    "Kalendarz wizyt i strona zapisów dla Twojej firmy. Klient rezerwuje sam, baza klientów zostaje u Ciebie. Od 50 zł miesięcznie, bez prowizji.",
  alternates: { canonical: "/" },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.whenbooking.pl";
const CONTACT_EMAIL = "kontakt@lukasznowak.dev";

/** Structured data for Google: lets the SERP show name, logo, ratings.
 *  We use SoftwareApplication because WHEN is a SaaS booking tool. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "WHEN",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "System rezerwacji online dla salonów, gabinetów i studiów. Widget na stronę, panel managera, baza klientów.",
  url: SITE_URL,
  inLanguage: "pl",
  author: {
    "@type": "Person",
    name: "Łukasz Nowak",
    url: "https://lukasznowak.dev",
  },
  // A floor, not a fixed price: what a business pays depends on how many SMS
  // reminders it sends. This used to declare 0 PLN, left over from when the
  // page sold a free demo — which told search engines the product was free.
  offers: {
    "@type": "Offer",
    priceCurrency: "PLN",
    availability: "https://schema.org/InStock",
    priceSpecification: {
      "@type": "PriceSpecification",
      minPrice: "50",
      priceCurrency: "PLN",
      valueAddedTaxIncluded: false,
    },
  },
};

/**
 * Highlight: bold + accent color. Used inline to make the eye stop on
 * key phrases when scrolling through long descriptions.
 */
function Hi({ children }: { children: ReactNode }) {
  return (
    <span className="font-semibold text-[var(--color-accent)]">{children}</span>
  );
}






/**
 * One quiet way in for somebody who wants to click before they write.
 *
 * This used to be three buttons carrying the hero. Selling now starts with a
 * demo built for the person by name, so a generic one is a worse version of
 * what they will get anyway — and "spin one up in 30 seconds" is a
 * SaaS-native gesture aimed at people who keep their diary on paper. The
 * generator still works and still helps mid-conversation, so it stays: one
 * line, low on the page, where it costs nobody anything.
 */
function DemoLink() {
  return (
    <a
      href="/api/demo/start?wariant=barber"
      className="text-sm text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-200 hover:underline"
    >
      Wolisz najpierw poklikać? Otwórz demo →
    </a>
  );
}

export default function StartPage() {
  return (
    <main className="min-h-screen text-zinc-100">
      {/* Force dark theme on the landing — without this, a previous visit to
          a light-themed demo (kosmetyka, joga) leaves `data-theme="light"` on
          <html> and the landing inherits it after client-side navigation. */}
      <ThemeApplier theme="dark" />
      {/* JSON-LD structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Top bar — opaque to cover grid */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="when" className="h-12 logo-adaptive" />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#features" className="hidden text-zinc-300 hover:text-zinc-100 sm:block transition-colors font-medium">Co to daje</a>
            <a href="#cena" className="hidden text-zinc-300 hover:text-zinc-100 sm:block transition-colors font-medium">Cena</a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-medium text-zinc-950 transition-opacity hover:opacity-90"
            >
              Napisz do mnie
            </a>
          </nav>
        </div>
      </header>

      {/* Hero — opaque, covers grid */}
      <section className="relative overflow-hidden border-b border-zinc-800/60 bg-zinc-950">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--color-accent)_18%,transparent),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <p className="mb-4 text-sm uppercase tracking-widest text-[var(--color-accent)]">System rezerwacji online</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Kalendarz wizyt, który jest<br />
            <span className="text-zinc-400">dalej Twój.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-400">
            Wizyty wpisujesz tak jak dotąd. Klient może zapisać się sam — <Hi>o 23:00 i w niedzielę</Hi>,
            bez dzwonienia w środku strzyżenia. Baza klientów zostaje u Ciebie:
            <Hi> bez prowizji</Hi> i bez cudzego portalu.
          </p>

          <div id="demo" className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="rounded-lg bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-zinc-950 transition-opacity hover:opacity-90"
            >
              Napisz do mnie →
            </a>
            <DemoLink />
          </div>
          <p className="mt-5 max-w-2xl text-sm text-zinc-500">
            WHEN zbudowałem sam i sam go wdrażam — <Hi>Łukasz Nowak</Hi>,{" "}
            <a
              href="https://lukasznowak.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-300"
            >
              lukasznowak.dev
            </a>
            . Piszesz do człowieka, nie do działu obsługi.
          </p>
        </div>
      </section>

      {/* Co to daje — two questions an owner actually has, side by side.
          This replaces four "how it works" cards, six industry tiles and a
          ten-item feature checklist. None of them were answering a question
          any more: the industries only ever told a physio to wonder whether
          they counted, and the walkthrough repeated the implementation
          section further down. Prospects are picked by hand now, so the page
          has nobody left to qualify. */}
      <section id="features" data-section-reveal className="border-b border-zinc-800/60 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 sm:grid-cols-2">
            <div data-reveal="left">
              <h2 className="text-2xl font-semibold tracking-tight">Co robi Twój klient</h2>
              <ul className="mt-5 space-y-3 text-zinc-400">
                <li>Wchodzi na Twoją stronę, wybiera usługę i wolny termin.</li>
                <li><Hi>Bez rejestracji</Hi>, bez instalowania aplikacji. Działa na telefonie.</li>
                <li>Dostaje potwierdzenie mailem i sam <Hi>odwoła albo przełoży</Hi> wizytę.</li>
              </ul>
            </div>
            <div data-reveal="left" style={{ "--reveal-delay": "90ms" } as React.CSSProperties}>
              <h2 className="text-2xl font-semibold tracking-tight">Co masz Ty</h2>
              <ul className="mt-5 space-y-3 text-zinc-400">
                <li>Grafik dnia i tygodnia, <Hi>wszyscy pracownicy w jednym widoku</Hi>.</li>
                <li>Wizyty dopisujesz ręcznie — klient i tak dostanie potwierdzenie.</li>
                <li>Godziny otwarcia, urlopy, dni wolne. <Hi>Baza klientów z historią.</Hi></li>
                <li>Osobna strona zapisów albo <Hi>widget na Twojej stronie</Hi>.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cena — the hero's treatment: flat dark with one accent glow. It used
          to be transparent so the calendar grid showed through, and with the
          grid gone a see-through section has nothing behind it. */}
      <section id="cena" data-section-reveal className="relative overflow-hidden border-b border-zinc-800/60 bg-zinc-950">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,color-mix(in_srgb,var(--color-accent)_14%,transparent),transparent_60%)]"
        />
        {/* Left, like everything above it. Centring works for a headline of
            three words and works against a paragraph: every line starts
            somewhere else, so the eye has to hunt for the beginning of each
            one. The page opens left-aligned and now keeps a single edge all
            the way down. */}
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <h2 data-reveal className="text-3xl font-semibold tracking-tight">Ile to kosztuje</h2>
          <p className="mt-6 text-4xl font-semibold tracking-tight text-[var(--color-accent)]">
            od 50 zł <span className="text-2xl font-normal text-zinc-400">/ miesiąc</span>
          </p>
          <div className="mt-6 max-w-xl space-y-4 text-zinc-400">
            <p>
              W tej cenie kalendarz, strona zapisów dla Twoich klientów i potwierdzenia mailem.
              Bez prowizji od rezerwacji.
            </p>
            <p>
              <Hi>„Od”</Hi>, bo dwie rzeczy zależą od Twojej firmy: ile <Hi>przypomnień</Hi> wysyłasz
              klientom i jak złożona jest <Hi>konfiguracja</Hi>. Jeden fotel to nie to samo co pięć osób
              z osobnymi grafikami, usługami i cenami.
            </p>
            <p>
              Jedno i drugie ustalamy przy wdrożeniu — <Hi>zanim cokolwiek zapłacisz</Hi>, wiesz,
              ile to u Ciebie wychodzi.
            </p>
          </div>
          <p className="mt-6 text-xs text-zinc-600">
            Pierwsze pięć firm ma tę cenę na stałe — w zamian za szczerą opinię, co działa, a co nie.
          </p>
        </div>
      </section>

      {/* Wdrożenie — black */}
      <section id="wdrozenie" data-section-reveal className="bg-black">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-200">Wdrożenie</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Chcesz uruchomić WHEN w swojej firmie?
          </h2>
          <div className="mt-6 max-w-xl space-y-4 text-zinc-400">
            <p>
              System można wdrożyć <Hi>na różne sposoby</Hi> — jako widget
              na istniejącej stronie, samodzielny panel do zarządzania rezerwacjami albo pełną stronę rezerwacji.
            </p>
            <p>
              Jeśli masz już stronę, <Hi>dopasujemy wygląd</Hi> do Twojej marki.
              Jeśli jej nie masz — <Hi>możemy przygotować wszystko od zera</Hi>.
            </p>
            <p>
              Wdrożenie odbywa się indywidualnie. <Hi>Nie zostajesz z konfiguracją sam</Hi> — przeprowadzam przez wszystko od początku do końca.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="rounded-lg bg-[var(--color-accent)] px-6 py-3 font-medium text-zinc-950 transition-opacity hover:opacity-90"
            >
              Napisz do mnie →
            </a>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Napisz, co robisz i jak dziś zapisujesz wizyty. Odpiszę, czy WHEN ma u Ciebie sens —
            a jeśli nie ma, powiem wprost.
          </p>
          <p className="mt-6">
            <DemoLink />
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-7 text-xs text-zinc-100">
          <p className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="when" className="h-6 logo-adaptive" />
            <span className="text-zinc-300">— system rezerwacji online</span>
          </p>
          <p className="flex items-center gap-3">
            <Link href="/polityka-prywatnosci" className="text-zinc-400 hover:text-zinc-100 transition-colors">
              Polityka prywatności
            </Link>
            <span className="text-zinc-700">·</span>
            <span>
              © {new Date().getFullYear()} &nbsp;·&nbsp;{" "}
              <a href="https://lukasznowak.dev" target="_blank" rel="noopener noreferrer" className="text-zinc-100 hover:opacity-80 transition-opacity">
                lukasznowak<span style={{ color: "var(--color-accent)" }}>.dev</span>
              </a>
            </span>
          </p>
        </div>
      </footer>

      <RevealOnScroll />
      <GlowCursor />
    </main>
  );
}
