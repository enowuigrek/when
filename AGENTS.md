<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Kontekst projektu

Pełny kontekst (techniczny + biznesowy + status) w pliku:
`~/Documents/nowy-kontekst/projekty/when.md`
Komunikacja marki w: `~/Documents/nowy-kontekst/marka/produkty/when.md`

Czytaj oba przed każdą zmianą która dotyczy biznesu, oferty lub komunikacji.
Aktualizuj sekcję "Log zmian" po każdej znaczącej zmianie w kodzie
(format: data — co zrobione, dlaczego, co dalej).

## Architektura

**`docs/ARCHITECTURE.md` — przeczytaj przed pierwszą zmianą w kodzie.**
Opisuje dwa tryby sprzedaży czasu (wizyta vs zajęcia) i gdzie dokładnie
biegnie granica między nimi, routing i rozwiązywanie najemcy, flagi
możliwości, słownictwo per branża, obsługę czasu oraz pułapki, w które
już wpadliśmy.

## Stack techniczny

Next.js 16 (App Router), Supabase, Vercel, TypeScript strict, Tailwind CSS.
Multi-tenant: każdy klient ma subdomenę `{slug}.whenbooking.pl`
Pierwszy klient live: `barbershop-tatarek.whenbooking.pl`
Demo u klientki w testach: `whenbooking.pl/demo/teczowka` — nie psuć.

## Zasady kodu

- TypeScript strict, brak `any`
- Server Components domyślnie, `"use client"` tylko gdy niezbędne
- Commity po angielsku: `fix:`, `feat:`, `refactor:`
- Przed commitem: `npx tsc --noEmit && npm run lint && npm run build`
  (lint ma 37 zastanych zgłoszeń — nie zwiększaj tej liczby)

### Jedno źródło prawdy

Zanim napiszesz tablicę dni tygodnia albo `addDays` — one już istnieją.
Każde z tych było kiedyś powielone i rozjechało się:

| Co | Gdzie |
|---|---|
| Dni tygodnia, skróty, kolejność, liczba mnoga | `lib/weekdays.ts` |
| Czas, strefa, `addDays`, `warsawDayOfWeek` | `lib/slots.ts` |
| Reguła grupy → konkretne daty | `lib/class-groups.ts` |
| Możliwości per najemca | `lib/features.ts` |
| Słownictwo per branża | `lib/vocabulary.ts` |
| Kolory zajęć | `lib/class-colors.ts` |
| Wybór terminu (filtry, siatka godzin) | `components/booking/` |
| Zapis na zajęcia (panel i rodzic) | `components/class-enroll-panel.tsx` |

### Zajęcia grupowe a wizyty

Miejsce w grupie to wiersz w `bookings` z `class_group_id`. Zapytania
liczące dostępność **muszą** filtrować `.is("class_group_id", null)` —
inaczej dwanaścioro dzieci w grupie zajmuje wszystkie fotele. Tak samo
działają ograniczenia `exclude` w bazie. Szczegóły w `docs/ARCHITECTURE.md`.

## CONTENT.md — treści strony

`~/Documents/nowy-kontekst/content/when.md`
Czytaj przed każdą zmianą tekstów na whenbooking.pl
Gdy Cowork zaktualizuje — synchronizuj z komponentami.

## DESIGN.md — system wizualny

`~/Documents/nowy-kontekst/design/when.md`
Czytaj go PRZED każdą zmianą stylów, kolorów, typografii lub layoutu.
Gdy Cowork zaktualizuje ten plik i poprosi o synchronizację — przepisz zmiany
do odpowiednich plików CSS / Tailwind config / komponentów.
Nowe komponenty buduj zgodnie z tokenami z tego pliku — nie dodawaj nowych wartości
bez jednoczesnej aktualizacji DESIGN.md.

## Dostępne narzędzia MCP

- **Supabase**: używaj proaktywnie do sprawdzenia schematu, RLS,
  logów, queries. Nie czekaj na pozwolenie przy operacjach read-only.
- **Vercel**: logi deploymentów i runtime przy debugowaniu.
