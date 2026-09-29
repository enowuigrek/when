# WHEN — jak to jest poskładane

Dla następnego czatu i dla mnie za trzy miesiące. Nie powtarza tego, co
widać w kodzie — opisuje **decyzje**, których z kodu nie widać, i miejsca,
gdzie łatwo zrobić krzywdę.

Stan na 29.09.2026.

---

## 1. Dwa sposoby sprzedawania czasu

To jest najważniejsze rozróżnienie w całym produkcie. Wszystko inne z niego
wynika.

| | **Wizyta** (appointment) | **Zajęcia** (class) |
|---|---|---|
| Kto | fryzjer, kosmetyczka, gabinet | pracownia, szkoła tańca, joga |
| Klient wybiera | dowolną godzinę z wolnych | dzień tygodnia z grafiku |
| Model | `services` + `staff` + wolne sloty | `services` + `class_groups` |
| Jedna sprzedaż | jedna `bookings` | **cztery** `bookings` (miesiąc) |
| Ogranicza je | godziny otwarcia, grafik pracownika | dzień i godzina grupy |
| Pojemność | liczba pracowników | `min/max_participants` grupy |
| Flaga | `pracownicy` (gdy jest z kogo wybierać) | `grupy` |

**Jeden tenant może mieć oba.** Tęczówka ma zajęcia i ukryte urodziny —
urodziny to wizyta. Dlatego te dwa tryby muszą się nie potykać o siebie.

### Gdzie przebiega granica (przeczytaj, zanim ruszysz dostępność)

Miejsce w grupie to wiersz w `bookings` z ustawionym `class_group_id`.
Dwanaścioro dzieci na poniedziałek to **dwanaście wierszy o tej samej
godzinie**. Stąd trzy zasady, które muszą być zgodne:

1. **Baza.** Oba ograniczenia `exclude` na `bookings`
   (`no_overlap_no_staff`, `no_overlap_staff`) mają w warunku
   `class_group_id is null`. Zajęcia ani nie blokują, ani nie są blokowane.
   Bez tego drugie dziecko nie mogło się zapisać (migracja `026`).
2. **Zapytania o wolne terminy.** `getBookingsInRangeForTenant`,
   `getBookingsInRange`, `getBusyStaffIdsForTenant`, `getBusyStaffIds`
   filtrują `.is("class_group_id", null)`. Inaczej dwanaścioro dzieci
   zajmuje wszystkie fotele i popołudnie wygląda na zajęte.
3. **Harmonogram.** Rysuje miejsca w grupie jako **jeden kafelek zajęć**, nie
   jako dwanaście kart. Filtr: `!b.class_group_id`.

> Jeśli kiedyś sala naprawdę ma być blokowana na czas zajęć — to jest
> **zasób** do zamodelowania, a nie efekt uboczny tego, jak przechowujemy
> miejsca. Nie rób tego przez zdjęcie filtra.

---

## 2. Multi-tenant i adresy

Jedna baza, kolumna `tenant_id` wszędzie. **RLS włączone, zero policy** —
dostęp idzie wyłącznie przez `createAdminClient()` (service role) po stronie
serwera. Nigdy nie wołaj Supabase z klienta.

Routing robi `proxy.ts` (w Next 16 to dawne `middleware.ts`):

| Adres | Trafia w | Jak się rozwiązuje tenant |
|---|---|---|
| `{slug}.whenbooking.pl/*` | `/widget/{slug}/*` | ze slug w URL |
| `/widget/{slug}/*` | to samo | ze slug w URL |
| `/demo/{slug}/*` | `/admin/*` + nagłówek `x-demo-slug` | z nagłówka, **bez logowania** |
| `/admin/*` | panel | z ciasteczka sesji |

`getAdminTenantId()` kolejno: nagłówek demo → sesja → tenant główny.
Dzięki temu ta sama strona panelu obsługuje demo i prawdziwego klienta.

W komponentach serwerowych linkuj przez `AdminLink`, w klienckich przez
`useAdminBase()` — same przepiszą `/admin/...` na `/demo/{slug}/...`.
`AdminLink` czyta `next/headers`, więc **w komponencie klienckim wysadzi
build**.

---

## 3. Możliwości per tenant (`tenants.features`)

`lib/features.ts`. Dziś dwie: `pracownicy`, `grupy`.

Zasady, które już raz zostały złamane i kosztowały:

- **Flaga rządzi tym, co jest *oferowane*** — zakładki, strony, pola. Nigdy
  tym, co już istnieje. Ukrycie licznika nie odsprzedaje karnetu.
- **Flaga, która powtarza dane, to drugie źródło prawdy.** `karnety`
  i `cena-od-osoby` zostały skasowane: usługa z `total_lessons` *jest*
  karnetem, z `price_per_person` *jest* liczona od osoby. `platnosci`
  skasowane, bo nie przełączało niczego.
- **Nieznane nazwy są ignorowane**, nie wysypują panelu. Dlatego nic nie
  trzeba migrować przy dodaniu nazwy.
- **Zakładka ukryta w nawigacji to nie to samo co strona wyłączona.**
  Każda strona pod flagą woła `notFound()` sama. Sprawdzone: Tęczówka na
  `/pracownicy` dostaje 404, nie pustą listę.

Dodanie możliwości = string w `FEATURES` + kod, który go czyta. Bez migracji.

---

## 4. Słownictwo per branża

Polski nie znosi automatycznej odmiany, więc trzymamy **całe etykiety**, nie
rdzenie. `lib/vocabulary.ts`:

- `services.enrollee_label` — „Imię i nazwisko dziecka" vs „Uczestnik"
- `services.enroll_action_label` — „Dopisz dziecko" vs „Dopisz uczestnika"
- `settings.classes_label` — nazwa zakładki: „Zajęcia", „Kursy", „Treningi"
- `newEntryLabel(runsGroups)` — „Nowy zapis" vs „Nowa rezerwacja"

Dni tygodnia są w **`lib/weekdays.ts` i tylko tam**. Były w sześciu
miejscach w trzech pisowniach („Sb" obok „So", „Cz" obok „czw").
`WEEKDAY_PLURAL` i `everyWeekday()` istnieją, bo liczbę mnogą robiono przez
doklejenie „i" — wychodziło „w piąteki" i „poniedziałeki", na ekranie
rodzica.

---

## 5. Czas

Wszystko liczone w **Europe/Warsaw**, przechowywane w UTC. `lib/slots.ts`
jest jedynym miejscem, które przelicza — `warsawLocalToUtc`,
`warsawDayOfWeek`, `warsawToday`, `addDays`. Nie pisz lokalnych kopii; były
trzy i wszystkie trzeba było potem sprowadzić z powrotem.

Spotkania grupy **nie są zapisywane jako wiersze z góry**. Grupa to reguła
(„poniedziałek 15:45"), a `lib/class-groups.ts` zamienia ją na daty.
Reguła plus arytmetyka nie może się zdezaktualizować; wygenerowane wiersze
mogłyby.

---

## 6. Czy prospekt ogląda demo

`demo_visits` (tenant, ścieżka, czas) + `DemoVisitBeacon` w dwóch layoutach:
panelu (`/demo/{slug}`) i strony klienta (`/widget/{slug}`, zapisywana pod
`/zapisy`, żeby `/` panelu i `/` widgetu nie były jednym wierszem).
Widać to w Zarządcy: wizyty, odsłony, liczba stron, „ostatnio".

Trzy rzeczy, o których trzeba pamiętać:

- **Wiersz nie mówi nic o gościu** — tylko ścieżka i czas. To jest celowe
  i dlatego **nie da się po fakcie odsiać własnych kliknięć**. Endpoint
  odrzuca je z góry: ruch z `localhost`/`127.0.0.1`/`*.local` i każdy
  z ciasteczkiem `when_admin`. Zanim to powstało, poranek testów dołożył
  kilkanaście „wejść" do dema, którego nikt z zewnątrz nie otworzył.
- **Tylko demo i trial.** `getDemoTenantIdBySlug` zwraca null dla `main`,
  więc beacon na widgecie nie liczy klientów prawdziwego salonu — odpowiada
  404 i nic nie zapisuje.
- **Wizyty, nie odsłony.** Zarządca grupuje odsłony w wizyty po przerwie
  30 minut. Jedno długie popołudnie i cztery powroty w tygodniu dają tę samą
  liczbę odsłon i znaczą co innego; powrót jest sygnałem. Liczone z samych
  czasów, bez przechowywania czegokolwiek o gościu.

Czego to nie powie: czy dwie wizyty to ta sama osoba. Bez identyfikatora się
nie da, a identyfikator to zmiana postawy wobec prywatności — decyzja
biznesowa, nie techniczna.

---

## 7. Pułapki, w które już wpadliśmy

- **Kalendarz otwiera się na złym miesiącu.** `CalendarPicker` wybiera
  miesiąc tak: `displayYearMonth` → tryb tygodnia → **`selectedDate`** →
  pierwszy wolny dzień od dziś → dziś. Kolejność ma znaczenie: kiedy
  „pierwszy wolny" był przed `selectedDate`, harmonogram otwierał się na
  sierpniu, pokazując wrzesień obok.
- **Ciemny motyw w jasnym.** W `globals.css` reguły dark idą **po**
  jasnych, więc zagnieżdżony jasny motyw przegrywa. Ucieczka: grupa tras
  (`app/rezerwacja/(when)/`).
- **`select("*")` zwraca więcej, niż mówi typ.** `BookingWithService` nie
  miał `class_group_id`, więc trzy miejsca dorzucały go rzutowaniem. Jak
  dodajesz kolumnę — dopisz ją do typu.
- **iCloud.** Katalog projektu jest w iCloud Drive. Przy synchronizacji
  `cloudd` potrafi zjeść procesor, budowanie trwa minuty, a w `.next`
  pojawiają się pliki `coś 2.ts` / `coś 3.ts`, przez które `tsc` krzyczy
  o zduplikowane identyfikatory. Kasowanie ich z `.next` jest bezpieczne
  (to artefakty builda).

---

## 8. Zanim scommitujesz

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Lint ma **37 zastanych zgłoszeń** (18 błędów, 19 ostrzeżeń) — głównie
`react-hooks/set-state-in-effect` i jeden `require()` w `lib/tpay.ts`.
Nie zwiększaj tej liczby; porównaj przed i po.

Commity po angielsku (`fix:`, `feat:`, `refactor:`), treść mówi **dlaczego**,
nie co.

---

## 9. Mapa katalogów

```
app/admin/(panel)/       panel właściciela; obsługuje też /demo/{slug}
app/admin/(superadmin)/  „Zarządca" — lista tenantów, opinie
app/widget/[tenantSlug]/ strona zapisów dla klienta końcowego
app/rezerwacja/(when)/   rezerwacje na własną stronę WHEN
lib/db/                  dostęp do bazy; *ForTenant = wersja jawna
lib/slots.ts             czas i strefa — jedyne miejsce
lib/class-groups.ts      reguła grupy → konkretne daty
lib/weekdays.ts          dni tygodnia — jedyne miejsce
lib/features.ts          możliwości per tenant
lib/vocabulary.ts        słownictwo per branża
components/booking/      wspólne kawałki wyboru terminu
components/class-enroll-panel.tsx  zapis na zajęcia — jeden dla obu stron
supabase/NNN_*.sql       migracje, po kolei; komentarz mówi dlaczego
```
