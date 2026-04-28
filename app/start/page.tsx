import Link from "next/link";

export const metadata = {
  title: "WHEN — system rezerwacji online",
  description: "Rezerwacje, grafiki pracowników, ceny per grupa. Postaw demo w 30 sekund.",
};

const useCases = [
  { title: "Barber shop", body: "Strzyżenie, broda, combo. Wielu fryzjerów, każdy z własnym grafikiem i cennikiem." },
  { title: "Gabinet kosmetyczny", body: "Manicure, mezoterapia, henna. Różne ceny per kosmetolog (junior/senior/master)." },
  { title: "Przychodnia / fizjo", body: "Wizyty u lekarzy lub fizjoterapeutów. Czas trwania per usługa, urlopy, dni wolne." },
  { title: "Weterynarz / groomer", body: "Wizyty z różnym czasem trwania, notatki o pacjencie, historia klienta." },
];

const features = [
  "Publiczna strona rezerwacji z Twoim brandingiem",
  "Grafik dzień/tydzień/miesiąc z podglądem wszystkich pracowników",
  "Grupy pracowników z osobnymi cenami (junior, senior, premium)",
  "Powiadomienia email do klienta + link do anulowania/przeniesienia",
  "Baza klientów z historią wizyt i notatkami",
  "Konfigurowalne godziny otwarcia, urlopy, dni wolne",
  "Widget embed — wklej na swoją stronę jedną linijką HTML",
  "Cron cleanup — demo tenants kasowane automatycznie po 24h",
];

const ownerSteps = [
  {
    n: "01",
    title: "Kliknij demo poniżej",
    body: "Wybierasz branżę — barber albo kosmetyka. Wlatujesz prosto do panelu managera z gotowymi danymi. Zero formularzy, zero karty.",
  },
  {
    n: "02",
    title: "Ogarnij panel w 5 minut",
    body: "Sprawdź harmonogram, edytuj usługi i ceny, zmień kolory. Dane demo są realistyczne — wyglądają jak Twój prawdziwy salon.",
  },
  {
    n: "03",
    title: "Wklej widget na swoją stronę",
    body: "W Ustawienia → Embed widget masz gotowy kod. Jedna linijka HTML i formularz rezerwacji pojawia się na Twojej stronie WordPress / Wix / własne HTML.",
  },
  {
    n: "04",
    title: "Zarządzaj rezerwacjami",
    body: "Nowe rezerwacje lądują w harmonogramie i w bazie klientów. Możesz przenosić, anulować, dodawać notatki, oznaczać no-show.",
  },
];

const clientSteps = [
  {
    n: "01",
    title: "Wchodzi na Twoją stronę",
    body: "Widzi listę usług z cenami i czasem trwania. Może wybrać konkretnego pracownika albo dowolnego.",
  },
  {
    n: "02",
    title: "Wybiera datę i godzinę",
    body: "Kalendarz pokazuje tylko dostępne dni. Sloty aktualizują się na bieżąco — zajęte są wyszarzone.",
  },
  {
    n: "03",
    title: "Podaje dane i potwierdza",
    body: "Imię, telefon, opcjonalnie email i uwagi. Bez rejestracji, bez logowania.",
  },
  {
    n: "04",
    title: "Dostaje potwierdzenie emailem",
    body: "Link do przeniesienia terminu i link do anulowania — klient ogarnie sam, bez dzwonienia do Ciebie.",
  },
];

function Steps({ steps }: { steps: typeof ownerSteps }) {
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <div key={s.n} className="relative">
          {i < steps.length - 1 && (
            <div
              aria-hidden
              className="absolute right-0 top-5 hidden h-px w-full translate-x-1/2 bg-zinc-800 lg:block"
            />
          )}
          <div className="relative rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
            <span className="font-mono text-xs text-[var(--color-accent)]">{s.n}</span>
            <h3 className="mt-2 font-semibold text-zinc-100">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StartPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/start" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="when" className="h-10 logo-adaptive" />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#jak-to-dziala" className="hidden text-zinc-300 hover:text-zinc-100 sm:block transition-colors font-medium">Jak to działa?</a>
            <a href="#features" className="hidden text-zinc-300 hover:text-zinc-100 sm:block transition-colors font-medium">Funkcje</a>
            <a
              href="#demo"
              className="rounded-lg bg-zinc-100 px-4 py-2 font-medium text-zinc-950 hover:bg-white transition-colors"
            >
              Wypróbuj demo →
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,162,106,0.18),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <p className="mb-4 text-sm uppercase tracking-widest text-[var(--color-accent)]">System rezerwacji online</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Rezerwacje, grafiki, ceny.<br />
            <span className="text-zinc-400">Zero papierologii.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-400">
            Postaw demo w 30 sekund. Sprawdź jak wygląda panel managera i strona, którą zobaczą Twoi klienci.
            Demo jest pełnoprawne — z pracownikami, usługami, przykładowymi rezerwacjami.
          </p>

          <div id="demo" className="mt-10 flex flex-wrap gap-3">
            <a
              href="/api/demo/start?wariant=barber"
              className="rounded-lg bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-zinc-950 transition-colors hover:opacity-90"
            >
              Demo — Barber Shop
            </a>
            <a
              href="/api/demo/start?wariant=kosmetyka"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-base font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            >
              Demo — Gabinet Kosmetyczny
            </a>
            <a
              href="/api/demo/start?wariant=joga"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-base font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            >
              Demo — Studio Jogi
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            Bez rejestracji, bez karty. Demo znika automatycznie po 24h.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS — owner */}
      <section id="jak-to-dziala" className="border-b border-zinc-800/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-zinc-700 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Dla właściciela
            </span>
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Jak to działa?</h2>
          <p className="mt-2 text-zinc-500">Od kliknięcia demo do działającego formularza na Twojej stronie — bez IT.</p>
          <Steps steps={ownerSteps} />
        </div>
      </section>

      {/* HOW IT WORKS — client */}
      <section className="border-b border-zinc-800/60 bg-zinc-900/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-zinc-700 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Co widzi Twój klient
            </span>
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Rezerwacja w 60 sekund.</h2>
          <p className="mt-2 text-zinc-500">Zero logowania, zero instalowania aplikacji. Działa na telefonie.</p>
          <Steps steps={clientSteps} />
        </div>
      </section>

      {/* Use cases */}
      <section className="border-b border-zinc-800/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Dla kogo to jest?</h2>
          <p className="mt-2 text-zinc-500">Wszędzie tam, gdzie ludzie umawiają się na konkretną godzinę.</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {useCases.map((u) => (
              <div key={u.title} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                <div className="mb-3 h-0.5 w-8 bg-[var(--color-accent)]" />
                <h3 className="text-lg font-semibold text-zinc-100">{u.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-400">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-zinc-800/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Co dostajesz</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent)] text-xs font-bold text-zinc-950">
                  ✓
                </span>
                <span className="text-sm text-zinc-300">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-4xl font-semibold tracking-tight">Najszybsza droga to po prostu spróbować.</h2>
          <p className="mt-4 text-zinc-400">Wybierz branżę najbliższą Twojej. Demo wygląda jakby było już Twoje.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/api/demo/start?wariant=barber"
              className="rounded-lg bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-zinc-950 transition-colors hover:opacity-90"
            >
              Demo — Barber
            </a>
            <a
              href="/api/demo/start?wariant=kosmetyka"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-base font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            >
              Demo — Gabinet
            </a>
            <a
              href="/api/demo/start?wariant=joga"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-base font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            >
              Demo — Studio Jogi
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-600">Bez rejestracji, bez karty. Demo znika po 24h.</p>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/20">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Wdrożenie</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Chcesz to uruchomić w swojej firmie?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-zinc-400">
            Skonfigurujemy system razem — usługi, pracownicy, godziny, kolory, widget na Twoją stronę.
            Napisz, żeby ustalić szczegóły.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:enowuigrek@gmail.com?subject=when%20—%20wdrożenie"
              className="rounded-lg bg-[var(--color-accent)] px-6 py-3 font-medium text-zinc-950 transition-colors hover:opacity-90"
            >
              Napisz do mnie →
            </a>
            <a
              href="https://lukasznowak.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              lukasznowak.dev
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-zinc-600">
          <p className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="when" className="h-4 logo-adaptive opacity-50" />
            <span>— system rezerwacji online</span>
          </p>
          <p>© {new Date().getFullYear()} &nbsp;·&nbsp; <a href="https://lukasznowak.dev" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">lukasznowak.dev</a></p>
        </div>
      </footer>
    </main>
  );
}
