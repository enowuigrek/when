import Link from "next/link";

export const metadata = {
  title: "WHEN — system rezerwacji online",
  description: "Rezerwacje, grafiki pracowników, ceny per grupa. Postaw demo w 30 sekund.",
};

const useCases = [
  { emoji: "💈", title: "Barber shop", body: "Strzyżenie, broda, combo. Wielu fryzjerów, każdy z własnym grafikiem." },
  { emoji: "💅", title: "Gabinet kosmetyczny", body: "Manicure, mezoterapia, henna. Różne ceny per kosmetolog (junior/senior)." },
  { emoji: "🩺", title: "Przychodnia / fizjo", body: "Wizyty u lekarzy lub fizjoterapeutów. Czas trwania per usługa, urlopy, dni wolne." },
  { emoji: "🐾", title: "Weterynarz / groomer", body: "Wizyty z różnym czasem trwania, notatki o pacjencie, historia klienta." },
];

const features = [
  "Publiczna strona rezerwacji z Twoim brandingiem",
  "Grafik dzień/tydzień/miesiąc z drag-and-drop",
  "Grupy pracowników z osobnymi cenami (junior, senior, premium)",
  "Powiadomienia email do klienta + link do anulowania/przeniesienia",
  "Baza klientów z historią wizyt i notatkami",
  "Konfigurowalne godziny otwarcia, urlopy, dni wolne",
];

export default function StartPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="border-b border-zinc-800/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/start" className="text-2xl font-bold tracking-tight">
            WHEN<span className="text-[var(--color-accent)]">?</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#features" className="text-zinc-400 hover:text-zinc-100">Funkcje</a>
            <a href="#demo" className="rounded-full bg-zinc-100 px-4 py-2 font-medium text-zinc-950 hover:bg-white">
              Wypróbuj demo
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
            Demo jest pełnoprawne — z pracownikami, usługami, przykładowymi rezerwacjami. Znika po 24h.
          </p>

          <div id="demo" className="mt-10 flex flex-wrap gap-3">
            <a
              href="/api/demo/start?wariant=barber"
              className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              💈 Demo — Barber Shop
            </a>
            <a
              href="/api/demo/start?wariant=kosmetyka"
              className="rounded-full border border-zinc-700 bg-zinc-900 px-6 py-3 text-base font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            >
              💅 Demo — Gabinet Kosmetyczny
            </a>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            Bez rejestracji, bez karty. Po kliknięciu wlatujesz prosto do panelu managera.
          </p>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-b border-zinc-800/60 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Dla kogo to jest?</h2>
          <p className="mt-2 text-zinc-500">Wszędzie tam, gdzie ludzie umawiają się na konkretną godzinę u konkretnej osoby.</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {useCases.map((u) => (
              <div key={u.title} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                <div className="text-3xl">{u.emoji}</div>
                <h3 className="mt-3 text-lg font-semibold text-zinc-100">{u.title}</h3>
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
              <li key={f} className="flex items-start gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-zinc-950">
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
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/api/demo/start?wariant=barber"
              className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Demo — Barber
            </a>
            <a
              href="/api/demo/start?wariant=kosmetyka"
              className="rounded-full border border-zinc-700 bg-zinc-900 px-6 py-3 text-base font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            >
              Demo — Gabinet
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-zinc-500">
          <p>
            <span className="font-bold text-zinc-300">WHEN<span className="text-[var(--color-accent)]">?</span></span> — system rezerwacji online
          </p>
          <p>© {new Date().getFullYear()} · Wszelkie prawa zastrzeżone</p>
        </div>
      </footer>
    </main>
  );
}
