# WHEN — roadmap

Stan: MVP działa. Demo działa. Landing działa. Domena `whenbooking.pl` podpięta.
Następny krok: dorobić rzeczy które pozwolą sprzedawać klientom premium
i wejść w nowe branże.

---

## Faza 1 — płatności i depozyty (priorytet 1)

To odblokowuje:
- **Gabinety premium** które biorą zadatek żeby ograniczyć no-showy
- **Restauracje** (depozyt przy rezerwacji stolika)
- **Studia** które sprzedają pojedyncze wejścia z góry

### Płatności online
- Integracja: **Tpay** (PL-friendly, BLIK) lub **Stripe** (lepsze API, droższe)
  - Rekomendacja: zacząć od **Tpay** — taniej, BLIK out-of-the-box, polskie umowy
- Per-tenant: każdy salon podpina swoje konto Tpay (Connect-style)
- Webhook od Tpay → marka rezerwacji jako `paid`
- Refundy: ręczne z panelu (MVP), automatyczne później

### Depozyt vs pełna płatność
Per-service config:
```
service.payment_mode: 'none' | 'deposit' | 'full'
service.deposit_amount_pln: number | null
```
- `none` — domyślnie, jak teraz
- `deposit` — np. zadatek 30 zł na manicure, reszta na miejscu
- `full` — pełna płatność z góry (joga, drogi zabieg)

### Race condition (problem "zarezerwowane ale nieopłacone")
- Slot blokowany na 10 min na czas płatności (`booking.status: 'pending_payment'`)
- Cron co minutę zwalnia wygasłe pending
- Po sukcesie webhook flipuje na `confirmed`
- Po 10 min bez webhooka — slot wraca do puli

**Szacunek:** 2-3 tygodnie na pełną integrację Tpay + UI w panelu + status flow.

---

## Faza 2 — SMS i lista rezerwowa

### SMS reminders
- Dostawca: **SMSAPI.pl** (PL, tanio, polskie nadawcy) albo Twilio (drożej, międzynarodowe)
- Reminder X godzin przed wizytą (per-tenant config)
- Powiadomienie o potwierdzeniu rezerwacji
- Limit / paczki SMS w ramach planu (kontrola kosztów)

### Lista rezerwowa (waitlist)
- Klient zapisuje się gdy slot zajęty
- Gdy ktoś anuluje → broadcast SMS/email do listy
- Pierwszy kto kliknie link → bierze slot
- Per-service / per-day waitlist

To duży feature, ale **bardzo go lubią gabinety** — eliminuje "puste sloty po anulacji".

**Szacunek:** 1.5-2 tygodnie.

---

## Faza 3 — zajęcia grupowe (joga, fitness)

Joga już działa w demo, ale traktuje sloty jak 1-osobowe. Brakuje:
- **Limit miejsc** na slot (np. 12 osób na zajęciach)
- **Lista zapisanych** widoczna dla prowadzącego
- **Cykliczne zajęcia** ("każdy wtorek 18:00 przez 3 miesiące")
- **Bulk-cancel** całych zajęć z notyfikacją

To rozszerzenie modelu danych:
```
slot.capacity: number  (default 1)
booking.party_size: number  (default 1)
```

**Szacunek:** 1-2 tygodnie.

---

## Faza 4 — restauracje (po Fazie 1)

Po płatnościach to w zasadzie nowa konfiguracja istniejącego silnika:
- "Usługa" → "Stolik X-osobowy"
- "Pracownik" → "Sala/strefa" (ogródek, sala główna, lounge)
- Czas wizyty stały (2h domyślnie)
- Opcjonalny depozyt (Faza 1)
- Liczba osób w rezerwacji (`party_size` z Fazy 3)

Praktycznie zero kodu jeśli Fazy 1 i 3 są zrobione — to głównie inne treści
i template w widgecie.

**Targetowanie:** koktajlbary, restauracje z menu degustacyjnym, ogródki sezonowe,
miejsca które mają realny problem z no-show.

---

## Faza 5 — monetyzacja

Teraz wszystko jest darmowe. W którymś momencie trzeba to zmonetyzować.

### Plany (propozycja)
- **Free** — 1 pracownik, 1 usługa, do 30 rezerwacji/mies, branding "Powered by WHEN"
- **Pro — 49 zł/mies** — bez limitu, bez brandingu, SMS reminders (50/mies), depozyty
- **Business — 149 zł/mies** — multi-location, lista rezerwowa, więcej SMS, API access

### Trial
- 14 dni Pro za darmo dla nowych
- Po 14 dniach downgrade do Free (nie blokować nagle)

### Płatność za WHEN
- Też przez Tpay (recurring) lub Stripe Subscriptions
- Subscription billing w `app/admin/(panel)/billing/`

---

## Małe rzeczy które warto zrobić wcześnie

Nie blokują niczego, ale podnoszą jakość:

- **Email domain config per-tenant** — żeby maile szły z `kontakt@salon.pl`,
  nie z `noreply@whenbooking.pl`. Resend obsługuje multi-domain.
- **Embed widget — modal popup** zamiast pełnej strony. Przycisk
  "Zarezerwuj" → otwiera overlay nad stroną klienta. Mniej tarcia.
- **Custom subdomena per-tenant** — `salon-name.whenbooking.pl` zamiast
  ścieżki `/widget/salon-name`. Lepiej wygląda do udostępniania.
- **"Dziś" button w panelu** — szybki powrót do dzisiejszego dnia w grafiku.
- **OG image dla każdej rezerwacji** — gdy klient wysyła link potwierdzenia
  na messenger, ładny preview z datą i godziną.
- **Mobile PWA dla właściciela** — żeby telefon mógł działać jak app, pushe
  o nowych rezerwacjach. Tańsze niż natywna apka.

---

## Czego NIE robić (na razie)

Każda z tych rzeczy to studnia bez dna, łatwo się wciągnąć.

- ❌ **Aplikacja natywna iOS/Android** — PWA wystarczy
- ❌ **Własny CRM** — to inny produkt, integracje wystarczą
- ❌ **Marketplace klientów** ("znajdź fryzjera w pobliżu") — to inny biznes,
  WHEN to narzędzie B2B nie B2C
- ❌ **AI chatbot do rezerwacji** — fajny gimmick, mało komu naprawdę pomaga
- ❌ **Integracja z Google Calendar dwukierunkowa** — Calendar to inna rzecz,
  klienci szybko się gubią

---

## SEO — co zostało po stronie użytkownika

Techniczne SEO już jest zrobione w kodzie:
- `app/robots.ts` — pozwala indeksować `/`, blokuje admin/widget/rezerwacja/api
- `app/sitemap.ts` — sitemap.xml z landingiem
- `app/layout.tsx` — bogate metadane (OG, Twitter, keywords, canonical)
- `app/page.tsx` — JSON-LD `SoftwareApplication` schema
- OG images dla landingu i widgetów (już istniały)

**Co musisz zrobić ręcznie po deployu:**

1. **Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console))
   - Dodaj `whenbooking.pl` jako domain property (DNS verification)
   - LUB jako URL prefix property: `https://www.whenbooking.pl` (HTML tag w `<head>` lub plik HTML)
   - Po weryfikacji wyślij sitemap: `https://www.whenbooking.pl/sitemap.xml`
   - Sprawdź "Coverage" po kilku dniach

2. **Google Analytics 4** lub **Plausible** (lżejsze, prywatne, bez cookie banner)
   - Plausible kosztuje od $9/mies, ale nie wymaga RODO consent
   - GA4 jest darmowy, ale wymaga cookie consent banner
   - **Sugestia:** Plausible na start (mało ruchu, czyste dane)
   - Snippet wstawić do `app/layout.tsx` (przed `</body>`)

3. **Bing Webmaster Tools** — opcjonalnie, importuje z Google Search Console

4. **Lighthouse audit** — zrób raz na produkcji, popraw co czerwone (np. obrazy bez alt, tap targets na mobile)

5. **Performance** — Core Web Vitals
   - LCP (Largest Contentful Paint) — landing ma duży hero, sprawdzić
   - CLS (Cumulative Layout Shift) — fonty z `next/font` już to ograniczają

## Bugi / TODO do następnej sesji

Rzeczy zauważone podczas testowania, czekają na osobną iterację:

- **Light theme — pełny audit.** Theme switcher zmienia teraz natychmiast,
  ale w wielu miejscach light mode wygląda źle / niespójnie. Przejść po
  każdej stronie w light theme i poprawić kontrasty.
- **Widget — całkowity redesign.** Obecny `/widget/[tenantSlug]/[serviceSlug]`
  wygląda gorzej niż `/rezerwacja/[slug]` (z `SiteHeader` + `SiteFooter`
  i ładnym stepperem). Widget powinien dostać ten sam UX co `/rezerwacja`
  (z dostosowaniem do ramki iframe). Duże zadanie.
- **iPhone — "Dodaj do kalendarza"** nie działa. Plik `.ics` powinien być
  generowany i serwowany z poprawnym MIME type `text/calendar`. Sprawdzić
  `app/api/rezerwacja/[id]/ical/route.ts`.
- **iPhone Safari — input zoom** już naprawiony (font-size 16px na mobile).
- **`when-three.vercel.app` w environment variables.** Po podpięciu domeny
  trzeba w Vercel Settings → Environment Variables ustawić
  `NEXT_PUBLIC_SITE_URL` na `https://www.whenbooking.pl` (lub bez `www`,
  zależnie od preferencji). Inaczej maile, OG i ical będą wskazywać na
  stary URL `*.vercel.app`.

## Otwarte pytania

Rzeczy do przemyślenia zanim się je zacznie kodować:

1. **Provisioning klienta** — jak nowy salon dostaje konto?
   Self-service (signup → kreator)? Czy ręcznie ja im zakładam?
   Self-service jest skalowalne, ręczne pozwala doradzić i zebrać feedback.
   **Sugestia:** ręcznie do 20 klientów, potem self-service.

2. **Wsparcie techniczne** — SLA? Zgłoszenia przez email? Discord?
   Na 5 klientów email wystarczy. Na 50 — trzeba narzędzia (np. Plain, Linear).

3. **Backupy danych** — Supabase robi automatycznie, ale czy klient może
   wyeksportować swoje dane (RODO)? Trzeba endpoint export/JSON.

4. **GDPR/RODO** — polityka prywatności, regulamin, processor agreement
   z Supabase. Przed pierwszą płatną sprzedażą musi być.

---

## Kolejność wykonania (sugestia)

1. **Faza 1 — Tpay + depozyty** (3 tyg)
2. **Email per-tenant + custom subdomena** (3-4 dni)
3. **Faza 3 — zajęcia grupowe** (1.5 tyg) — odblokuje pełnoprawnie jogę
4. **Faza 4 — restauracje** (1 tyg, głównie content)
5. **SMS reminders** (1 tyg)
6. **Faza 5 — monetyzacja** — gdy będzie 5+ płacących klientów
7. **Lista rezerwowa** — gdy ktoś o nią poprosi

Razem do "produkt którym da się zarabiać": ~2-2.5 miesiąca pracy ciągłej.
Realnie z przerwami i innymi projektami: 4-6 miesięcy.
