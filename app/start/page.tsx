import Link from "next/link";

export const metadata = {
  title: "WHEN — system rezerwacji online",
  description: "Zobacz swój salon w działającym demo — bez rejestracji. Postaw demo w 30 sekund.",
};

const useCases = [
  { title: "Barber shop", body: "Strzyżenie, broda, combo. Wielu fryzjerów, własne grafiki i cenniki." },
  { title: "Gabinet kosmetyczny", body: "Manicure, mezoterapia, henna. Różne ceny zależnie od poziomu specjalisty." },
  { title: "Przychodnia / fizjo", body: "Wizyty lekarzy i fizjoterapeutów. Czas trwania usług, urlopy, dni wolne." },
  { title: "Weterynarz / groomer", body: "Wizyty o różnym czasie trwania, historia klienta i notatki." },
  { title: "I wiele innych", body: "Każdy biznes, w którym klient rezerwuje konkretny termin — od studia jogi po konsultacje i usługi specjalistyczne." },
];

const features = [
  "Publiczna strona rezerwacji dopasowana do Twojej marki",
  "Pełny podgląd grafiku — dzień, tydzień lub miesiąc",
  "Widok wszystkich pracowników w jednym miejscu",
  "Różne ceny dla grup pracowników i poziomów usług",
  "Automatyczne powiadomienia email dla klientów",
  "Link do anulowania lub przeniesienia wizyty",
  "Baza klientów z historią wizyt i notatkami",
  "Konfigurowalne godziny otwarcia, urlopy i dni wolne",
  "Widget rezerwacji do osadzenia na stronie",
  "Proste wdrożenie — wystarczy jedna linijka HTML",
];

const ownerSteps = [
  {
    n: "01",
    title: "Kliknij demo poniżej",
    body: "Wybierasz branżę — barber, kosmetyka albo studio. Wchodzisz prosto do panelu managera z gotowymi danymi. Bez formularzy, bez podpinania karty.",
  },
  {
    n: "02",
    title: "Poznaj panel w 5 minut",
    body: "Sprawdź harmonogram, edytuj usługi i ceny, zmień kolory. Dane demo są realistyczne — wyglądają jak prawdziwy salon.",
  },
  {
    n: "03",
    title: "Wklej widget na swoją stronę",
    body: "W Ustawienia → Embed widget masz gotowy kod. Jedna linijka HTML i formularz rezerwacji pojawia się na Twojej stronie. Działa z WordPress, Wix lub własnym HTML.",
  },
  {
    n: "04",
    title: "Zarządzaj rezerwacjami",
    body: "Nowe rezerwacje lądują w harmonogramie i bazie klientów. Możesz dodawać wizyty ręcznie — gdy klient zadzwoni lub przyjdzie osobiście, system i tak wyśle potwierdzenie.",
  },
];

const clientSteps = [
  {
    n: "01",
    title: "Wchodzi na Twoją stronę",
    body: "Widok usług z cenami i czasem trwania. Klient może wybrać konkretnego pracownika albo dowolnego.",
  },
  {
    n: "02",
    title: "Wybiera datę i godzinę",
    body: "Kalendarz pokazuje tylko dostępne dni. Sloty aktualizują się na bieżąco.",
  },
  {
    n: "03",
    title: "Podaje dane i potwierdza",
    body: "Imię, telefon, opcjonalnie email i uwagi. Bez rejestracji.",
  },
  {
    n: "04",
    title: "Dostaje potwierdzenie emailem",
    body: "Link do przeniesienia terminu i anulowania wizyty. Bez konieczności dzwonienia.",
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

function DemoCTAs({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const baseLink = "rounded-lg px-6 py-3 text-base font-medium transition-colors";
  const primary = `${baseLink} bg-[var(--color-accent)] text-zinc-950 hover:opacity-90`;
  const secondary = `${baseLink} border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800`;
  const labels = variant === "hero"
    ? { barber: "Demo — Barber Shop", kosmetyka: "Demo — Gabinet Kosmetyczny", joga: "Demo — Studio Jogi" }
    : { barber: "Demo — Barber", kosmetyka: "Demo — Gabinet", joga: "Demo — Studio Jogi" };
  return (
    <div className="flex flex-wrap gap-3">
      <a href="/api/demo/start?wariant=barber" className={primary}>{labels.barber}</a>
      <a href="/api/demo/start?wariant=kosmetyka" className={secondary}>{labels.kosmetyka}</a>
      <a href="/api/demo/start?wariant=joga" className={secondary}>{labels.joga}</a>
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
            Zobacz swój salon w działającym demo —<br />
            <span className="text-zinc-400">bez rejestracji.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-400">
            Postaw demo w 30 sekund. Sprawdź jak wygląda panel managera i strona, którą zobaczą Twoi klienci.
            Demo jest pełnoprawne — z pracownikami, usługami i przykładowymi rezerwacjami.
          </p>

          <div id="demo" className="mt-10">
            <DemoCTAs variant="hero" />
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

          <div className="mt-10">
            <DemoCTAs variant="compact" />
            <p className="mt-3 text-xs text-zinc-600">Bez rejestracji, bez karty. Demo znika po 24h.</p>
          </div>
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
          <p className="mt-2 text-zinc-500">
            Wszędzie tam, gdzie liczy się kalendarz, dostępność i szybkie umawianie wizyt.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <section className="border-b border-zinc-800/60">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-4xl font-semibold tracking-tight">Najszybsza droga to po prostu spróbować.</h2>
          <p className="mt-4 text-zinc-400">Wybierz branżę najbliższą Twojej. Demo wygląda jakby było już Twoje.</p>
          <div className="mt-8 flex justify-center">
            <DemoCTAs variant="compact" />
          </div>
          <p className="mt-4 text-xs text-zinc-600">Bez rejestracji, bez karty. Demo znika po 24h.</p>
        </div>
      </section>

      {/* Wdrożenie — expanded */}
      <section className="bg-zinc-900/20">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Wdrożenie</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Chcesz to uruchomić w swojej firmie?
          </h2>
          <div className="mx-auto mt-6 max-w-xl space-y-4 text-zinc-400">
            <p>
              <span className="text-zinc-200">System można wdrożyć na różne sposoby</span> — jako widget
              na istniejącej stronie, samodzielny panel do zarządzania rezerwacjami albo pełną stronę rezerwacji.
            </p>
            <p>
              Jeśli masz już stronę, dopasujemy wygląd i sposób działania do Twojej marki.
              Jeśli jej nie masz — możemy przygotować wszystko od zera.
            </p>
            <p>
              Wdrożenie odbywa się indywidualnie, zależnie od tego, czego potrzebuje Twoja firma.
              Nie zostajesz z konfiguracją sam — pomagamy uruchomić system od początku do końca.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:kontakt@lukasznowak.dev?subject=when%20—%20wdrożenie"
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
