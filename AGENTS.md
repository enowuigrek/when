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

## Stack techniczny

Next.js 16 (App Router), Supabase, Vercel, TypeScript strict, Tailwind CSS.
Multi-tenant: każdy klient ma subdomenę `{slug}.whenbooking.pl`
Pierwszy klient live: `barbershop-tatarek.whenbooking.pl`

## Zasady kodu

- TypeScript strict, brak `any`
- Server Components domyślnie, `"use client"` tylko gdy niezbędne
- Commity po angielsku: `fix:`, `feat:`, `refactor:`
- Przed commitem: `npx tsc --noEmit`

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
