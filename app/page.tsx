import Link from "next/link";
import type { ReactNode } from "react";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { GlowCursor } from "@/components/glow-cursor";
import { BookMeetingButton } from "@/components/book-meeting-button";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "WHEN — system rezerwacji online",
  description: "Zobacz swój salon w działającym demo — bez rejestracji. Postaw demo w 30 sekund.",
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
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "PLN",
    availability: "https://schema.org/InStock",
    description: "Demo bez rejestracji",
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

type Step = { n: string; title: string; body: ReactNode };
type UseCase = { title: string; body: ReactNode };

const useCases: UseCase[] = [
  { title: "Barber shop", body: <>Strzyżenie, broda, combo. <Hi>Wielu fryzjerów</Hi>, własne grafiki i cenniki.</> },
  { title: "Gabinet kosmetyczny", body: <>Manicure, mezoterapia, henna. <Hi>Różne ceny per specjalista</Hi>.</> },
  { title: "Studio jogi / fitness", body: <><Hi>Zajęcia grupowe</Hi>, limity miejsc, stałe godziny zajęć.</> },
  { title: "Przychodnia / fizjo", body: <>Wizyty lekarzy i fizjoterapeutów. <Hi>Urlopy, dni wolne</Hi>.</> },
  { title: "Weterynarz / groomer", body: <>Wizyty o różnym czasie trwania, <Hi>historia klienta</Hi>, notatki.</> },
  { title: "I wiele innych", body: <>Każdy biznes, w którym <Hi>klient rezerwuje konkretny termin</Hi>.</> },
];

const features: ReactNode[] = [
  <>Strona rezerwacji w <Hi>Twojej marce</Hi></>,
  <>Grafik: <Hi>dzień, tydzień, miesiąc</Hi></>,
  <>Wszyscy pracownicy w <Hi>jednym widoku</Hi></>,
  <><Hi>Różne ceny</Hi> dla grup pracowników</>,
  <><Hi>Powiadomienia email</Hi> do klientów</>,
  <>Anulowanie i zmiana terminu <Hi>jednym klikiem</Hi></>,
  <>Baza klientów z <Hi>historią i notatkami</Hi></>,
  <>Godziny otwarcia, <Hi>urlopy, dni wolne</Hi></>,
  <>Widget do <Hi>osadzenia na stronie</Hi></>,
  <>Wdrożenie: <Hi>jedna linijka HTML</Hi></>,
];

const ownerSteps: Step[] = [
  {
    n: "01",
    title: "Kliknij demo poniżej",
    body: <>Wybierasz branżę — barber, kosmetyka albo studio. Wchodzisz prosto do <Hi>panelu managera</Hi> z gotowymi danymi. <Hi>Bez formularzy, bez podpinania karty.</Hi></>,
  },
  {
    n: "02",
    title: "Poznaj panel w 5 minut",
    body: <>Sprawdź harmonogram, edytuj usługi i ceny, zmień kolory. <Hi>Dane demo są realistyczne</Hi> — wyglądają jak prawdziwy salon.</>,
  },
  {
    n: "03",
    title: "Wklej widget na swoją stronę",
    body: <>W Ustawienia → Embed widget masz gotowy kod. <Hi>Jedna linijka HTML</Hi> i formularz rezerwacji pojawia się na Twojej stronie. Działa z <Hi>WordPress, Wix lub własnym HTML</Hi>.</>,
  },
  {
    n: "04",
    title: "Zarządzaj rezerwacjami",
    body: <>Nowe rezerwacje lądują w harmonogramie i bazie klientów. Możesz dodawać wizyty ręcznie — gdy klient zadzwoni lub przyjdzie osobiście, <Hi>system i tak wyśle potwierdzenie</Hi>.</>,
  },
];

const clientSteps: Step[] = [
  {
    n: "01",
    title: "Wchodzi na Twoją stronę",
    body: <>Widok usług z cenami i czasem trwania. Klient może wybrać <Hi>konkretnego pracownika</Hi> albo <Hi>dowolnego</Hi>.</>,
  },
  {
    n: "02",
    title: "Wybiera datę i godzinę",
    body: <>Kalendarz pokazuje <Hi>tylko dostępne dni</Hi>. Sloty aktualizują się <Hi>na bieżąco</Hi>.</>,
  },
  {
    n: "03",
    title: "Podaje dane i potwierdza",
    body: <>Imię, telefon, opcjonalnie email i uwagi. <Hi>Bez rejestracji.</Hi></>,
  },
  {
    n: "04",
    title: "Dostaje potwierdzenie emailem",
    body: <>Link do <Hi>przeniesienia terminu</Hi> i <Hi>anulowania wizyty</Hi>. Bez konieczności dzwonienia.</>,
  },
];

function Steps({ steps }: { steps: typeof ownerSteps }) {
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <div
          key={s.n}
          className="relative"
          data-reveal="left"
          style={{ "--reveal-delay": `${i * 110}ms` } as React.CSSProperties}
        >
          <div className="glow-card group relative rounded-xl border border-zinc-800/60 bg-zinc-900 p-5 transition-all hover:border-[var(--color-accent)]/40 hover:bg-zinc-800">
            <span className="font-mono text-3xl font-bold leading-none text-[var(--color-accent)]/80 transition-colors group-hover:text-[var(--color-accent)]">{s.n}</span>
            <h3 className="mt-3 font-semibold text-zinc-100">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoCTAs() {
  const baseLink = "rounded-lg px-6 py-3 text-base font-medium transition-colors text-center";
  const primary = `${baseLink} bg-[var(--color-accent)] text-zinc-950 hover:opacity-90`;
  const secondary = `${baseLink} border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800`;
  // Same labels for both variants — keeps the three buttons visually equal.
  const labels = { barber: "Barber Shop", kosmetyka: "Gabinet Kosmetyczny", joga: "Studio Jogi" };
  // Grid: stacked on mobile, three equal columns from sm up.
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <a href="/api/demo/start?wariant=barber" className={primary}>Demo — {labels.barber}</a>
      <a href="/api/demo/start?wariant=kosmetyka" className={secondary}>Demo — {labels.kosmetyka}</a>
      <a href="/api/demo/start?wariant=joga" className={secondary}>Demo — {labels.joga}</a>
    </div>
  );
}

/**
 * Returns the widget URL for the "Book a meeting with me" popup.
 * Looks up the owner tenant by OWNER_EMAIL env var, then picks the
 * first active service (ordered by sort_order). Falls back to a
 * hardcoded path so the button never disappears.
 */
async function getOwnerWidgetSrc(): Promise<string> {
  const fallback = "/widget/when/demo-30-min";
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return fallback;

  const supabase = createAdminClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("email", ownerEmail)
    .maybeSingle();
  if (!tenant) return fallback;

  const { data: svc } = await supabase
    .from("services")
    .select("slug")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (!svc) return `/widget/${tenant.slug}`;

  return `/widget/${tenant.slug}/${svc.slug}`;
}

export default async function StartPage() {
  const ownerWidgetSrc = await getOwnerWidgetSrc();

  return (
    <main className="min-h-screen text-zinc-100">
      {/* JSON-LD structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Fixed calendar grid — landing only */}
      <div aria-hidden className="landing-grid-bg" />
      {/* Top bar — opaque to cover grid */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="when" className="h-12 logo-adaptive" />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#jak-to-dziala" className="hidden text-zinc-300 hover:text-zinc-100 sm:block transition-colors font-medium">Jak to działa?</a>
            <a href="#features" className="hidden text-zinc-300 hover:text-zinc-100 sm:block transition-colors font-medium">Funkcje</a>
            <BookMeetingButton
              src={ownerWidgetSrc}
              label="Umów rozmowę"
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-medium text-zinc-950 transition-opacity hover:opacity-90"
            />
          </nav>
        </div>
      </header>

      {/* Hero — opaque, covers grid */}
      <section className="relative overflow-hidden border-b border-zinc-800/60 bg-zinc-950">
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
            Postaw demo w <Hi>30 sekund</Hi>. Sprawdź jak wygląda <Hi>panel managera</Hi> i strona, którą zobaczą Twoi klienci.
            Demo jest <Hi>pełnoprawne</Hi> — z pracownikami, usługami i przykładowymi rezerwacjami.
          </p>

          <div id="demo" className="mt-10">
            <DemoCTAs />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <p className="text-xs text-zinc-600">Bez rejestracji, bez karty. Demo znika po 24h.</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline transition-colors"
            >
              Wolisz najpierw pogadać? Napisz do mnie →
            </a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — owner */}
      <section id="jak-to-dziala" data-section-reveal className="section-glow border-b border-zinc-800/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-zinc-950 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-200">
              Dla właściciela
            </span>
          </div>
          <h2 data-reveal className="mt-3 text-3xl font-semibold tracking-tight">Jak to działa?</h2>
          <p className="mt-2 text-zinc-500">Od kliknięcia demo do działającego formularza na Twojej stronie — bez IT.</p>
          <Steps steps={ownerSteps} />

          <div className="mt-10">
            <DemoCTAs />
            <p className="mt-3 text-xs text-zinc-600">Bez rejestracji, bez karty. Demo znika po 24h.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — client — black, covers grid */}
      <section data-section-reveal className="border-b border-zinc-800/60 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-zinc-950 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-200">
              Co widzi Twój klient
            </span>
          </div>
          <h2 data-reveal className="mt-3 text-3xl font-semibold tracking-tight">Rezerwacja w 60 sekund.</h2>
          <p className="mt-2 text-zinc-500">Zero logowania, zero instalowania aplikacji. Działa na telefonie.</p>
          <Steps steps={clientSteps} />
        </div>
      </section>

      {/* Use cases */}
      <section data-section-reveal className="section-glow border-b border-zinc-800/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 data-reveal className="text-3xl font-semibold tracking-tight">Dla kogo jest WHEN?</h2>
          <p className="mt-2 text-zinc-500">
            Wszędzie tam, gdzie liczy się kalendarz, dostępność i szybkie umawianie wizyt.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((u, i) => (
              <div
                key={u.title}
                data-reveal="left"
                style={{ "--reveal-delay": `${(i % 3) * 90}ms` } as React.CSSProperties}
                className="glow-card rounded-xl border border-zinc-800/60 bg-zinc-900 p-6 transition-colors hover:border-[var(--color-accent)]/40"
              >
                <div className="mb-3 h-0.5 w-8 bg-[var(--color-accent)]" />
                <h3 className="text-lg font-semibold text-zinc-100">{u.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-400">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" data-section-reveal className="section-glow border-b border-zinc-800/60 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 data-reveal className="text-3xl font-semibold tracking-tight">Co dostajesz</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((f, i) => (
              <li
                key={i}
                data-reveal="left"
                style={{ "--reveal-delay": `${(i % 2) * 80 + Math.floor(i / 2) * 60}ms` } as React.CSSProperties}
                className="glow-card flex items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900 p-4"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent)] text-xs font-bold text-zinc-950">
                  ✓
                </span>
                <span className="text-sm text-zinc-300">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA — transparent, shows grid */}
      <section data-section-reveal className="border-b border-zinc-800/60">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 data-reveal className="text-4xl font-semibold tracking-tight">Najszybsza droga to po prostu spróbować.</h2>
          <p className="mt-4 text-zinc-400">Wybierz branżę najbliższą Twojej. Demo wygląda jakby było już Twoje.</p>
          <div className="mt-8 flex justify-center">
            <DemoCTAs />
          </div>
          <p className="mt-4 text-xs text-zinc-600">Bez rejestracji, bez karty. Demo znika po 24h.</p>
        </div>
      </section>

      {/* Wdrożenie — black */}
      <section id="wdrozenie" data-section-reveal className="bg-black">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-200">Wdrożenie</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Chcesz uruchomić WHEN w swojej firmie?
          </h2>
          <div className="mx-auto mt-6 max-w-xl space-y-4 text-zinc-400">
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
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <BookMeetingButton src={ownerWidgetSrc} />
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            >
              Napisz do mnie →
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            Najpierw rozmowa albo wiadomość — konto zakładamy dopiero, gdy ma to sens
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
          <p>
            © {new Date().getFullYear()} &nbsp;·&nbsp;{" "}
            <a href="https://lukasznowak.dev" target="_blank" rel="noopener noreferrer" className="text-zinc-100 hover:opacity-80 transition-opacity">
              lukasznowak<span style={{ color: "var(--color-accent)" }}>.dev</span>
            </a>
          </p>
        </div>
      </footer>

      <RevealOnScroll />
      <GlowCursor />
    </main>
  );
}
