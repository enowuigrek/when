import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type DemoVariant = "barber" | "kosmetyka" | "joga" | "taniec" | "zorba";

type ServiceSeed = {
  slug: string; name: string; description: string;
  duration_min: number; price_pln: number; sort_order: number;
  is_group?: boolean; max_participants?: number;
};
type StaffSeed = { name: string; bio: string; color: string; sort_order: number };
type GroupSeed = { name: string; sort_order: number; staffNames: string[]; priceMultiplier: number };

const BARBER_SERVICES: ServiceSeed[] = [
  { slug: "strzyzenie", name: "Strzyżenie męskie", description: "Klasyczne strzyżenie maszynką i nożyczkami, mycie, stylizacja.", duration_min: 30, price_pln: 60, sort_order: 1 },
  { slug: "broda", name: "Modelowanie brody", description: "Przycięcie i konturowanie brody, ciepły kompres, balsam.", duration_min: 30, price_pln: 50, sort_order: 2 },
  { slug: "combo", name: "Strzyżenie + broda", description: "Pełen pakiet: włosy + broda. Najpopularniejsza opcja.", duration_min: 60, price_pln: 100, sort_order: 3 },
  { slug: "dziecko", name: "Strzyżenie dziecięce", description: "Do 12 roku życia. Spokojnie, bez pośpiechu.", duration_min: 30, price_pln: 45, sort_order: 4 },
];

const BARBER_STAFF: StaffSeed[] = [
  { name: "Marek", bio: "Klasyczne strzyżenia i golenie brzytwą.", color: "#d4a26a", sort_order: 1 },
  { name: "Piotr", bio: "Nowoczesne stylizacje i brodowanie.", color: "#6ab0d4", sort_order: 2 },
  { name: "Tomek", bio: "Mistrz fade i drobiazgowych detali.", color: "#a07fbf", sort_order: 3 },
];

const BARBER_GROUPS: GroupSeed[] = [
  { name: "Standard", sort_order: 1, staffNames: ["Marek", "Piotr"], priceMultiplier: 1 },
  { name: "Premium", sort_order: 2, staffNames: ["Tomek"], priceMultiplier: 1.4 },
];

const KOSMETYKA_SERVICES: ServiceSeed[] = [
  { slug: "oczyszczanie", name: "Oczyszczanie wodorowe", description: "Głębokie oczyszczanie skóry z nawilżeniem.", duration_min: 60, price_pln: 220, sort_order: 1 },
  { slug: "mezoterapia", name: "Mezoterapia igłowa", description: "Odżywczy koktajl wstrzykiwany do skóry właściwej.", duration_min: 75, price_pln: 400, sort_order: 2 },
  { slug: "henna", name: "Henna brwi + regulacja", description: "Stylizacja brwi henną pudrową i regulacja kształtu.", duration_min: 30, price_pln: 80, sort_order: 3 },
  { slug: "mani-hybryda", name: "Manicure hybrydowy", description: "Pełen manicure z lakierem hybrydowym.", duration_min: 75, price_pln: 150, sort_order: 4 },
  { slug: "depilacja-noga", name: "Depilacja woskiem — nogi", description: "Pełne nogi, wosk twardy.", duration_min: 60, price_pln: 130, sort_order: 5 },
];

const KOSMETYKA_STAFF: StaffSeed[] = [
  { name: "Anna", bio: "Kosmetolog dyplomowany, specjalizacja: zabiegi pielęgnacyjne.", color: "#e8a4b8", sort_order: 1 },
  { name: "Kasia", bio: "Mistrzyni stylizacji paznokci i brwi.", color: "#a4c8e8", sort_order: 2 },
  { name: "Magda", bio: "Senior kosmetolog, zabiegi anti-aging i mezoterapia.", color: "#bfa07f", sort_order: 3 },
];

const KOSMETYKA_GROUPS: GroupSeed[] = [
  { name: "Junior", sort_order: 1, staffNames: ["Kasia"], priceMultiplier: 0.8 },
  { name: "Standard", sort_order: 2, staffNames: ["Anna"], priceMultiplier: 1 },
  { name: "Senior", sort_order: 3, staffNames: ["Magda"], priceMultiplier: 1.3 },
];

const JOGA_SERVICES: ServiceSeed[] = [
  { slug: "joga-poczatkujacy", name: "Joga dla początkujących", description: "Podstawy asan, praca z oddechem, relaks. Idealna na start.", duration_min: 75, price_pln: 55, sort_order: 1, is_group: true, max_participants: 12 },
  { slug: "vinyasa-flow", name: "Vinyasa Flow", description: "Dynamiczne połączenie asan z oddechem. Wymagana podstawowa znajomość jogi.", duration_min: 60, price_pln: 60, sort_order: 2, is_group: true, max_participants: 14 },
  { slug: "pilates", name: "Pilates", description: "Wzmacnianie głębokiej muskulatury, postawa, core.", duration_min: 60, price_pln: 65, sort_order: 3, is_group: true, max_participants: 10 },
  { slug: "medytacja", name: "Medytacja i oddech", description: "Techniki oddechowe (pranayama) i prowadzona medytacja. Dla każdego.", duration_min: 45, price_pln: 45, sort_order: 4, is_group: true, max_participants: 20 },
  { slug: "joga-zaawansowana", name: "Joga zaawansowana", description: "Asany odwrócone, pogłębione pozycje, balanse. Dla doświadczonych.", duration_min: 90, price_pln: 70, sort_order: 5, is_group: true, max_participants: 8 },
  { slug: "masaz-tajski", name: "Masaż tajski tradycyjny", description: "Połączenie akupresury i biernego stretchingu. Praca na matę, w wygodnym ubraniu.", duration_min: 90, price_pln: 220, sort_order: 6, is_group: false },
  { slug: "masaz-shiatsu", name: "Masaż Shiatsu", description: "Japońska technika ucisku punktów meridianów. Głęboki relaks i odblokowanie energii.", duration_min: 60, price_pln: 180, sort_order: 7, is_group: false },
  { slug: "spa-balijskie", name: "Rytuał balijski", description: "Masaż z gorącymi olejkami, peeling i okład. 120 minut totalnego odprężenia.", duration_min: 120, price_pln: 320, sort_order: 8, is_group: false },
];

const JOGA_STAFF: StaffSeed[] = [
  { name: "Zofia", bio: "Certyfikowana instruktorka jogi (RYT 500). Specjalizacja: Hatha i Vinyasa.", color: "#7eb89a", sort_order: 1 },
  { name: "Olga", bio: "Instruktorka Pilates i jogi prenatalnej. Pasjonatka pracy z ciałem.", color: "#b89a7e", sort_order: 2 },
  { name: "Marta", bio: "Nauczycielka medytacji i technik oddechowych. 10 lat praktyki.", color: "#9a7eb8", sort_order: 3 },
  { name: "Mei Lin", bio: "Specjalistka masażu tajskiego i shiatsu. 8 lat doświadczenia w spa Bangkok i Tokio.", color: "#d4a26a", sort_order: 4 },
];

// Joga nie ma grup cenowych — każdy instruktor ta sama stawka
const JOGA_GROUPS: GroupSeed[] = [];

const TANIEC_SERVICES: ServiceSeed[] = [
  { slug: "taneczny-mix", name: "Taneczny Mix (dzieci)", description: "Zajęcia taneczne dla dzieci 4–10 lat. Ruch, rytm, zabawa — bez stresu i oceniania.", duration_min: 45, price_pln: 40, sort_order: 1, is_group: true, max_participants: 14 },
  { slug: "hip-hop", name: "Hip-Hop", description: "Dynamiczne zajęcia hip-hopowe dla młodzieży i dorosłych. Każdy poziom mile widziany.", duration_min: 60, price_pln: 45, sort_order: 2, is_group: true, max_participants: 16 },
  { slug: "taniec-wspolczesny", name: "Taniec Współczesny", description: "Technika contemporary, improwizacja, praca z przestrzenią i ciałem.", duration_min: 60, price_pln: 45, sort_order: 3, is_group: true, max_participants: 14 },
  { slug: "modern-jazz", name: "Modern / Jazz", description: "Fuzja jazzu i modern dance — technika, rytm i ekspresja sceniczna.", duration_min: 60, price_pln: 45, sort_order: 4, is_group: true, max_participants: 14 },
  { slug: "taniec-towarzyski", name: "Taniec Towarzyski", description: "Walc, tango, foxtrot, quickstep — w parach lub solo. Poziomy od podstawowego.", duration_min: 60, price_pln: 50, sort_order: 5, is_group: true, max_participants: 12 },
  { slug: "lekcja-indywidualna", name: "Lekcja indywidualna", description: "Prywatna godzina z instruktorem — Twoje tempo, Twój styl, konkretny postęp. Rezerwujesz online, bez dzwonienia.", duration_min: 60, price_pln: 120, sort_order: 6, is_group: false },
];

const TANIEC_STAFF: StaffSeed[] = [
  { name: "Kamil", bio: "Instruktor hip-hopu i tańca współczesnego. 10 lat na parkiecie, 6 lat nauczania.", color: "#d4a26a", sort_order: 1 },
  { name: "Liza", bio: "Choreografka, specjalizacja: modern jazz i taniec sceniczny.", color: "#e8a4b8", sort_order: 2 },
  { name: "Vadim", bio: "Mistrz tańca towarzyskiego, trener par turniejowych.", color: "#6ab0d4", sort_order: 3 },
  { name: "Patrycja W.", bio: "Instruktorka dzieci i młodzieży, pedagog ruchu.", color: "#a07fbf", sort_order: 4 },
  { name: "Hubert", bio: "Tancerz i instruktor contemporary, breakdance.", color: "#7eb89a", sort_order: 5 },
  { name: "Karolina", bio: "Taniec towarzyski, latino. Uczestniczka ogólnopolskich turniejów.", color: "#e8c46a", sort_order: 6 },
  { name: "Mateusz S.", bio: "Hip-hop, waacking, voguing — specjalista od stylów ulicznych.", color: "#c76b9b", sort_order: 7 },
  { name: "Natalia N.", bio: "Instruktorka tańca współczesnego i modern/jazz. Absolwentka PWST.", color: "#d4846a", sort_order: 8 },
];

// Szkoła tańca — każdy instruktor ta sama stawka bazowa
const TANIEC_GROUPS: GroupSeed[] = [];

// ── Zorba (Częstochowa) ─────────────────────────────────────────────────────
// Prospekt: szkoła tańca prowadzona jednoosobowo przez Marcina. Na ich stronie
// pierwszy taniec i lekcje indywidualne są "ustalane w dogodnym terminie" —
// czyli wyłącznie telefonicznie. Demo ma pokazać, że to samo da się umówić
// online o 23:00 w niedzielę. Dlatego oba stoją na górze listy.
//
// Wszystkie pozycje mają is_group:false — obsługa zajęć grupowych (limity
// miejsc) została usunięta w 410e545, więc oznaczenie ich jako grupowych
// pokazywałoby w widgecie zajęte terminy po jednej rezerwacji.
const ZORBA_SERVICES: ServiceSeed[] = [
  { slug: "pierwszy-taniec-weselny", name: "Pierwszy Taniec Weselny", description: "Choreografia przygotowana pod Waszą piosenkę i możliwości. Zwykle 4–6 spotkań przed weselem. Termin rezerwujesz online — o każdej porze.", duration_min: 60, price_pln: 150, sort_order: 1 },
  { slug: "lekcja-indywidualna", name: "Lekcje indywidualne", description: "Prywatna godzina z instruktorem — Twoje tempo, Twój styl. Solo lub w parze. Bez dzwonienia i ustalania, wybierasz wolny termin z kalendarza.", duration_min: 60, price_pln: 120, sort_order: 2 },
  { slug: "taneczny-mix", name: "Taneczny Mix (dzieci i młodzież)", description: "Zajęcia taneczne dla dzieci i młodzieży. Ruch, rytm i zabawa — bez stresu i oceniania.", duration_min: 45, price_pln: 40, sort_order: 3 },
  { slug: "latino-solo", name: "Latino Solo", description: "Salsa, bachata, cha-cha — solo, bez partnera. Energia, rytm i dobra zabawa.", duration_min: 60, price_pln: 45, sort_order: 4 },
  { slug: "kurs-tanca-uzytkowego", name: "Kurs Tańca Użytkowego", description: "Taniec towarzyski w praktyce — na wesele, studniówkę i każdą imprezę. Walc, tango, foxtrot.", duration_min: 60, price_pln: 50, sort_order: 5 },
  { slug: "fitbabka", name: "Fitbabka (zajęcia dla pań)", description: "Taneczny trening dla pań — kondycja, sylwetka i dobry nastrój w jednym.", duration_min: 45, price_pln: 35, sort_order: 6 },
  { slug: "taniec-szkola-rekreacja", name: "Taniec — Szkoła / Rekreacja / Zabawa", description: "Zajęcia ogólnotaneczne dla dorosłych. Od podstaw, w swoim tempie, bez presji.", duration_min: 60, price_pln: 45, sort_order: 7 },
];

// Jednoosobowa obsługa — kolejnych instruktorów dodaje się w panelu
// (Pracownicy → Dodaj); grafik i przypisanie usług tworzą się automatycznie.
const ZORBA_STAFF: StaffSeed[] = [
  { name: "Marcin", bio: "Właściciel i instruktor. Pierwszy taniec, taniec użytkowy i zajęcia dla dzieci.", color: "#d4a26a", sort_order: 1 },
];

const ZORBA_GROUPS: GroupSeed[] = [];

// Baza klientów Zorby. Pary narzeczonych trzymane obok siebie — w panelu widać
// wtedy, że pierwszy taniec to powtarzalny cykl spotkań, a nie pojedyncza wizyta.
const ZORBA_CUSTOMERS = [
  ["Anna Grabowska",       "+48502100201", "anna.grabowska@example.com"],
  ["Michał Grabowski",     "+48502100202", null],
  ["Karolina Zielińska",   "+48502100203", "karolina.z@example.com"],
  ["Bartosz Zieliński",    "+48502100204", null],
  ["Magdalena Nowak",      "+48502100205", "magda.nowak@example.com"],
  ["Tomasz Nowak",         "+48502100206", null],
  ["Julia Kaczmarek",      "+48502100207", "julia.k@example.com"],
  ["Piotr Wysocki",        "+48502100208", "piotr.wysocki@example.com"],
  ["Agnieszka Mazur",      "+48502100209", null],
  ["Natalia Sikora",       "+48502100210", "natalia.sikora@example.com"],
  ["Ewa Krawczyk",         "+48502100211", null],
  ["Zuzanna Adamczyk",     "+48502100212", "zuzia.a@example.com"],
  ["Robert Pawlak",        "+48502100213", null],
  ["Iwona Dudek",          "+48502100214", "iwona.dudek@example.com"],
  ["Krzysztof Baran",      "+48502100215", null],
] as const;

const SETTINGS = {
  barber: {
    business_name: "Demo Barber",
    tagline: "Klasyka, precyzja, bez pośpiechu.",
    description: "Demo konto — wszystkie zmiany znikną po 24h. Pograj tym jak swoim.",
    address_street: "ul. Demo 1",
    address_city: "Warszawa",
    address_postal: "00-001",
    phone: "+48 600 000 000",
    email: null,
    color_accent: "#d4a26a",
    theme: "dark" as const,
    slot_granularity_min: 15,
    booking_horizon_days: 21,
  },
  kosmetyka: {
    business_name: "Demo Gabinet Kosmetyczny",
    tagline: "Twoje miejsce na chwilę dla siebie.",
    description: "Demo konto — wszystkie zmiany znikną po 24h. Testuj śmiało.",
    address_street: "ul. Demo 1",
    address_city: "Warszawa",
    address_postal: "00-001",
    phone: "+48 600 000 000",
    email: null,
    color_accent: "#e8a4b8",
    theme: "light" as const,
    slot_granularity_min: 15,
    booking_horizon_days: 21,
  },
  joga: {
    business_name: "Demo Studio Jogi",
    tagline: "Ruch. Oddech. Spokój.",
    description: "Demo konto — wszystkie zmiany znikną po 24h. Sprawdź jak działają zajęcia grupowe.",
    address_street: "ul. Demo 1",
    address_city: "Warszawa",
    address_postal: "00-001",
    phone: "+48 600 000 000",
    email: null,
    color_accent: "#7eb89a",
    theme: "light" as const,
    slot_granularity_min: 30,
    booking_horizon_days: 28,
  },
  zorba: {
    business_name: "Szkoła Tańca Zorba",
    tagline: "Pierwszy taniec i lekcje indywidualne — zarezerwuj online, o każdej porze.",
    description: "Konto demo przygotowane dla Szkoły Tańca Zorba. Klikaj śmiało — to kopia, nic tu nie jest prawdziwe.",
    // Schemat ma jedno pole adresu; druga sala podana obok, żeby obie były widoczne.
    address_street: "ul. Sikorskiego 56 (także: ul. Wysockiego 37)",
    address_city: "Częstochowa",
    address_postal: "42-200",
    phone: "+48 34 300 00 00",
    email: null,
    color_accent: "#c8843c",
    theme: "dark" as const,
    slot_granularity_min: 30,
    booking_horizon_days: 28,
  },
  taniec: {
    business_name: "Studio Tańca Estyma",
    tagline: "Zapisz się online — bez dzwonienia.",
    description: "Demo konto — wszystkie zmiany znikną po 24h. Sprawdź jak działa rezerwacja w szkole tańca.",
    address_street: "ul. Okulickiego 116",
    address_city: "Częstochowa",
    address_postal: "42-200",
    phone: "+48 34 300 00 00",
    email: null,
    color_accent: "#d4709a",
    theme: "dark" as const,
    slot_granularity_min: 30,
    booking_horizon_days: 28,
  },
};

const SAMPLE_NAMES = [
  ["Adam Kowalski", "+48500100201", "adam@example.com"],
  ["Marta Nowak", "+48500100202", "marta@example.com"],
  ["Krzysztof Wiśniewski", "+48500100203", null],
  ["Ewa Lewandowska", "+48500100204", "ewa@example.com"],
  ["Paweł Wójcik", "+48500100205", null],
] as const;

type HoursSeed = { day_of_week: number; open_time: string | null; close_time: string | null; closed: boolean };

/** Mon–Fri daytime, Sat morning, Sun closed. */
const HOURS_STANDARD: HoursSeed[] = [
  { day_of_week: 0, open_time: null, close_time: null, closed: true },
  { day_of_week: 1, open_time: "10:00", close_time: "19:00", closed: false },
  { day_of_week: 2, open_time: "10:00", close_time: "19:00", closed: false },
  { day_of_week: 3, open_time: "10:00", close_time: "19:00", closed: false },
  { day_of_week: 4, open_time: "10:00", close_time: "19:00", closed: false },
  { day_of_week: 5, open_time: "10:00", close_time: "19:00", closed: false },
  { day_of_week: 6, open_time: "09:00", close_time: "15:00", closed: false },
];

/** Classes run into the evening; open seven days. */
const HOURS_STUDIO: HoursSeed[] = [
  { day_of_week: 0, open_time: "08:00", close_time: "20:00", closed: false },
  { day_of_week: 1, open_time: "07:00", close_time: "21:00", closed: false },
  { day_of_week: 2, open_time: "07:00", close_time: "21:00", closed: false },
  { day_of_week: 3, open_time: "07:00", close_time: "21:00", closed: false },
  { day_of_week: 4, open_time: "07:00", close_time: "21:00", closed: false },
  { day_of_week: 5, open_time: "07:00", close_time: "21:00", closed: false },
  { day_of_week: 6, open_time: "08:00", close_time: "18:00", closed: false },
];

/** Late evenings for after-work classes, Sunday closed. */
const HOURS_DANCE: HoursSeed[] = [
  { day_of_week: 0, open_time: null, close_time: null, closed: true },
  { day_of_week: 1, open_time: "10:00", close_time: "21:00", closed: false },
  { day_of_week: 2, open_time: "10:00", close_time: "21:00", closed: false },
  { day_of_week: 3, open_time: "10:00", close_time: "21:00", closed: false },
  { day_of_week: 4, open_time: "10:00", close_time: "21:00", closed: false },
  { day_of_week: 5, open_time: "10:00", close_time: "21:00", closed: false },
  { day_of_week: 6, open_time: "09:00", close_time: "16:00", closed: false },
];

/**
 * Everything that varies per demo variant, in one place. Adding a variant is a
 * single entry here plus a `SETTINGS` entry — previously it meant editing four
 * parallel ternary chains, where missing one silently seeded another variant's
 * data.
 */
const VARIANTS: Record<DemoVariant, {
  services: ServiceSeed[];
  staff: StaffSeed[];
  groups: GroupSeed[];
  hours: HoursSeed[];
  customers: readonly (readonly [string, string, string | null])[];
}> = {
  barber:    { services: BARBER_SERVICES,    staff: BARBER_STAFF,    groups: BARBER_GROUPS,    hours: HOURS_STANDARD, customers: SAMPLE_NAMES },
  kosmetyka: { services: KOSMETYKA_SERVICES, staff: KOSMETYKA_STAFF, groups: KOSMETYKA_GROUPS, hours: HOURS_STANDARD, customers: SAMPLE_NAMES },
  joga:      { services: JOGA_SERVICES,      staff: JOGA_STAFF,      groups: JOGA_GROUPS,      hours: HOURS_STUDIO,   customers: SAMPLE_NAMES },
  taniec:    { services: TANIEC_SERVICES,    staff: TANIEC_STAFF,    groups: TANIEC_GROUPS,    hours: HOURS_DANCE,    customers: SAMPLE_NAMES },
  zorba:     { services: ZORBA_SERVICES,     staff: ZORBA_STAFF,     groups: ZORBA_GROUPS,     hours: HOURS_DANCE,    customers: ZORBA_CUSTOMERS },
};

export async function seedDemoTenant(tenantId: string, variant: DemoVariant): Promise<void> {
  const supabase = createAdminClient();
  const { services, staff, groups, hours, customers: customerSeed } = VARIANTS[variant];
  const settings = SETTINGS[variant];

  // Settings
  await supabase.from("settings").insert({ tenant_id: tenantId, ...settings });

  // Business hours
  await supabase.from("business_hours").insert(hours.map((h) => ({ ...h, tenant_id: tenantId })));

  // Time filters
  await supabase.from("time_filters").insert([
    { tenant_id: tenantId, label: "Rano", from_hour: 6, to_hour: 12, sort_order: 1 },
    { tenant_id: tenantId, label: "Południe", from_hour: 12, to_hour: 15, sort_order: 2 },
    { tenant_id: tenantId, label: "Popołudnie", from_hour: 15, to_hour: 18, sort_order: 3 },
    { tenant_id: tenantId, label: "Wieczór", from_hour: 18, to_hour: 23, sort_order: 4 },
  ]);

  // Services
  const { data: insertedServices } = await supabase
    .from("services")
    .insert(services.map((s) => ({
      ...s,
      active: true,
      tenant_id: tenantId,
      is_group: s.is_group ?? false,
      max_participants: s.max_participants ?? null,
    })))
    .select("id, slug");
  const serviceByName = new Map((insertedServices ?? []).map((s) => [s.slug as string, s.id as string]));

  // Staff
  const { data: insertedStaff } = await supabase
    .from("staff")
    .insert(staff.map((s) => ({ ...s, active: true, tenant_id: tenantId })))
    .select("id, name");
  const staffByName = new Map((insertedStaff ?? []).map((s) => [s.name as string, s.id as string]));

  // staff_services: every staff offers every service (demo)
  const ssRows = (insertedStaff ?? []).flatMap((st) =>
    (insertedServices ?? []).map((sv) => ({
      tenant_id: tenantId,
      staff_id: st.id as string,
      service_id: sv.id as string,
    }))
  );
  if (ssRows.length) await supabase.from("staff_services").insert(ssRows);

  // Staff schedules: same as business hours for everyone
  const scheduleRows = (insertedStaff ?? []).flatMap((st) =>
    hours
      .filter((h) => !h.closed)
      .map((h) => ({
        tenant_id: tenantId,
        staff_id: st.id as string,
        day_of_week: h.day_of_week,
        start_time: h.open_time,
        end_time: h.close_time,
      }))
  );
  if (scheduleRows.length) await supabase.from("staff_schedules").insert(scheduleRows);

  // Groups
  const { data: insertedGroups } = await supabase
    .from("staff_groups")
    .insert(groups.map((g) => ({ tenant_id: tenantId, name: g.name, sort_order: g.sort_order })))
    .select("id, name");
  const groupByName = new Map((insertedGroups ?? []).map((g) => [g.name as string, g.id as string]));

  // Group memberships
  const memberRows = groups.flatMap((g) => {
    const groupId = groupByName.get(g.name);
    if (!groupId) return [];
    return g.staffNames
      .map((sn) => staffByName.get(sn))
      .filter((id): id is string => Boolean(id))
      .map((staffId) => ({ tenant_id: tenantId, staff_id: staffId, group_id: groupId }));
  });
  if (memberRows.length) await supabase.from("staff_group_members").insert(memberRows);

  // Group price overrides (when multiplier !== 1)
  const overrideRows = groups.flatMap((g) => {
    if (g.priceMultiplier === 1) return [];
    const groupId = groupByName.get(g.name);
    if (!groupId) return [];
    return services.map((s) => ({
      tenant_id: tenantId,
      service_id: serviceByName.get(s.slug)!,
      group_id: groupId,
      price_pln: Math.round(s.price_pln * g.priceMultiplier),
      duration_min: null,
    }));
  });
  if (overrideRows.length) await supabase.from("service_group_prices").insert(overrideRows);

  // Customers
  const customerRows = customerSeed.map(([name, phone, email]) => ({
    tenant_id: tenantId,
    name,
    phone,
    email,
  }));
  await supabase.from("customers").insert(customerRows);

  // Sample bookings
  const staffIds = (insertedStaff ?? []).map((s) => s.id as string);
  const serviceList = (insertedServices ?? []).map((s) => ({
    id: s.id as string,
    slug: s.slug as string,
  }));
  const serviceMeta = new Map(services.map((s) => [s.slug, s]));

  const bookingRows: Array<Record<string, unknown>> = [];
  const today = new Date();

  if (variant === "zorba") {
    // Jednoosobowa szkoła — wszystko idzie na Marcina, więc terminy nie mogą
    // się nakładać (constraint no_overlap_staff). Rozkład jest ułożony ręcznie
    // i przy zmianach trzeba pilnować, żeby wpisy z tego samego dnia się
    // rozjeżdżały o pełny czas trwania usługi.
    //
    // Ciężar położony na pierwszy taniec i lekcje indywidualne — to one mają
    // pokazać, że rzecz "ustalana w dogodnym terminie" da się kliknąć online.
    const marcin = staffIds[0];

    /** Warsaw wall-clock → UTC instant, poprawnie przez DST. */
    function wawInstant(dayOffset: number, hh: number, mm = 0): Date {
      const base = new Date(today);
      base.setDate(base.getDate() + dayOffset);
      const guess = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm, 0));
      const wawHour = Number(
        new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).format(guess)
      );
      const offsetH = (wawHour - guess.getUTCHours() + 24) % 24;
      return new Date(guess.getTime() - offsetH * 3600_000);
    }

    // [dayOffset, godzina, minuta, slug usługi, indeks klienta]
    const plan: Array<[number, number, number, string, number]> = [
      // ── miniony tydzień i wcześniej (bieżący miesiąc) ──
      [-14, 17, 0, "pierwszy-taniec-weselny", 0],
      [-13, 18, 0, "lekcja-indywidualna", 6],
      [-11, 16, 0, "latino-solo", 8],
      [-10, 10, 0, "taneczny-mix", 10],
      [-10, 11, 0, "fitbabka", 13],
      [-8, 18, 0, "pierwszy-taniec-weselny", 0],
      [-7, 19, 0, "kurs-tanca-uzytkowego", 12],
      [-6, 17, 0, "lekcja-indywidualna", 7],
      [-4, 18, 0, "pierwszy-taniec-weselny", 2],
      [-3, 11, 0, "taniec-szkola-rekreacja", 14],
      [-1, 19, 0, "lekcja-indywidualna", 9],
      // ── dziś ──
      [0, 11, 0, "lekcja-indywidualna", 6],
      [0, 16, 0, "fitbabka", 13],
      [0, 18, 0, "pierwszy-taniec-weselny", 2],
      [0, 19, 30, "latino-solo", 8],
      // ── najbliższe dni ──
      [1, 17, 0, "pierwszy-taniec-weselny", 0],
      [2, 18, 0, "lekcja-indywidualna", 7],
      [3, 16, 0, "taneczny-mix", 10],
      [4, 10, 0, "pierwszy-taniec-weselny", 4],
      [6, 19, 0, "lekcja-indywidualna", 11],
      [7, 17, 0, "kurs-tanca-uzytkowego", 12],
    ];

    for (const [dayOffset, hh, mm, slug, custIdx] of plan) {
      const serviceId = serviceByName.get(slug);
      const meta = serviceMeta.get(slug);
      if (!serviceId || !meta) continue;
      const cust = ZORBA_CUSTOMERS[custIdx];
      const starts = wawInstant(dayOffset, hh, mm);
      bookingRows.push({
        tenant_id: tenantId,
        service_id: serviceId,
        staff_id: marcin,
        customer_name: cust[0],
        customer_phone: cust[1],
        customer_email: cust[2] ?? null,
        starts_at: starts.toISOString(),
        ends_at: new Date(starts.getTime() + meta.duration_min * 60_000).toISOString(),
        status: "confirmed",
        price_pln_snapshot: meta.price_pln,
        duration_min_snapshot: meta.duration_min,
      });
    }
  } else if (variant === "taniec") {
    // Dance school: mix of group classes + individual lessons (hero use-case).
    // Spread across this month: past bookings + today + upcoming week.
    const DANCE_CUSTOMERS = [
      ["Zofia Kowalska",       "+48501100201", "zofia@example.com"],
      ["Aleksandra Nowak",     "+48501100202", "ola@example.com"],
      ["Marta Wiśniewska",     "+48501100203", null],
      ["Jan Dąbrowski",        "+48501100204", "jan@example.com"],
      ["Katarzyna Zielińska",  "+48501100205", null],
      ["Piotr Lewandowski",    "+48501100206", "piotr@example.com"],
      ["Monika Szymańska",     "+48501100207", null],
      ["Tomasz Wójcik",        "+48501100208", "tomasz@example.com"],
      ["Natalia Kamińska",     "+48501100209", null],
      ["Paweł Kowalczyk",      "+48501100210", "pawel@example.com"],
      ["Agnieszka Mazur",      "+48501100211", null],
      ["Michał Piotrowska",    "+48501100212", "michal@example.com"],
      ["Magdalena Grabowska",  "+48501100213", "magda@example.com"],
      ["Robert Nowakowski",    "+48501100214", null],
      ["Iwona Wiśniewska",     "+48501100215", "iwona@example.com"],
    ] as const;

    const staffIds = (insertedStaff ?? []).map((s) => s.id as string);
    const indId = serviceByName.get("lekcja-indywidualna");
    const hipHopId = serviceByName.get("hip-hop");
    const modernJazzId = serviceByName.get("modern-jazz");
    const towarzyskiId = serviceByName.get("taniec-towarzyski");
    const mixId = serviceByName.get("taneczny-mix");

    const indMeta = serviceMeta.get("lekcja-indywidualna")!;
    const hipHopMeta = serviceMeta.get("hip-hop")!;
    const modernJazzMeta = serviceMeta.get("modern-jazz")!;
    const towarzyskiMeta = serviceMeta.get("taniec-towarzyski")!;
    const mixMeta = serviceMeta.get("taneczny-mix")!;

    // Helper to build UTC ISO for a date offset from today + hour/minute in Warsaw (UTC+2 in Aug)
    function warsawSlot(dayOffset: number, hourWaw: number, minWaw = 0): { starts: string; ends: string; dur: number } {
      const base = new Date(today);
      base.setDate(base.getDate() + dayOffset);
      const utcH = hourWaw - 2; // CEST = UTC+2
      const starts = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate(), utcH, minWaw, 0));
      return {
        starts: starts.toISOString(),
        ends: new Date(starts.getTime() + indMeta.duration_min * 60_000).toISOString(),
        dur: indMeta.duration_min,
      };
    }

    function groupSlot(dayOffset: number, hourWaw: number, meta: typeof indMeta): { starts: string; ends: string } {
      const base = new Date(today);
      base.setDate(base.getDate() + dayOffset);
      const utcH = hourWaw - 2;
      const starts = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate(), utcH, 0, 0));
      const ends = new Date(starts.getTime() + meta.duration_min * 60_000);
      return { starts: starts.toISOString(), ends: ends.toISOString() };
    }

    // ── Past individual lessons (this month, before today) ──────────────────
    const pastInd = [
      { dayOffset: -13, hour: 10, staffIdx: 0, custIdx: 0 },  // Kamil
      { dayOffset: -12, hour: 11, staffIdx: 1, custIdx: 3 },  // Liza
      { dayOffset:  -7, hour: 10, staffIdx: 2, custIdx: 2 },  // Vadim
      { dayOffset:  -5, hour: 10, staffIdx: 3, custIdx: 1 },  // Patrycja W.
      { dayOffset:  -3, hour: 18, staffIdx: 5, custIdx: 4 },  // Karolina
    ];
    for (const { dayOffset, hour, staffIdx, custIdx } of pastInd) {
      const slot = warsawSlot(dayOffset, hour);
      const cust = DANCE_CUSTOMERS[custIdx];
      if (indId)
        bookingRows.push({
          tenant_id: tenantId, service_id: indId, staff_id: staffIds[staffIdx],
          customer_name: cust[0], customer_phone: cust[1], customer_email: cust[2] ?? null,
          starts_at: slot.starts, ends_at: slot.ends, status: "confirmed",
          price_pln_snapshot: indMeta.price_pln, duration_min_snapshot: indMeta.duration_min,
        });
    }

    // ── Past group classes ──────────────────────────────────────────────────
    const pastGroups = [
      { dayOffset: -10, hour: 17, meta: hipHopMeta, id: hipHopId,       custs: [6, 5, 8] },
      { dayOffset:  -6, hour: 15, meta: towarzyskiMeta, id: towarzyskiId, custs: [9, 10] },
      { dayOffset:  -3, hour: 16, meta: mixMeta, id: mixId,             custs: [12, 7] },
    ];
    for (const { dayOffset, hour, meta, id, custs } of pastGroups) {
      if (!id) continue;
      const slot = groupSlot(dayOffset, hour, meta);
      for (const ci of custs) {
        const cust = DANCE_CUSTOMERS[ci];
        bookingRows.push({
          tenant_id: tenantId, service_id: id, staff_id: null,
          customer_name: cust[0], customer_phone: cust[1], customer_email: cust[2] ?? null,
          starts_at: slot.starts, ends_at: slot.ends, status: "confirmed",
          price_pln_snapshot: meta.price_pln, duration_min_snapshot: meta.duration_min,
        });
      }
    }

    // ── Today ───────────────────────────────────────────────────────────────
    const todayInd = [
      { hour: 10, staffIdx: 0, custIdx: 11 },  // Kamil
      { hour: 12, staffIdx: 6, custIdx: 14 },  // Mateusz S.
      { hour: 18, staffIdx: 4, custIdx: 13 },  // Hubert
    ];
    for (const { hour, staffIdx, custIdx } of todayInd) {
      const slot = warsawSlot(0, hour);
      const cust = DANCE_CUSTOMERS[custIdx];
      if (indId)
        bookingRows.push({
          tenant_id: tenantId, service_id: indId, staff_id: staffIds[staffIdx],
          customer_name: cust[0], customer_phone: cust[1], customer_email: cust[2] ?? null,
          starts_at: slot.starts, ends_at: slot.ends, status: "confirmed",
          price_pln_snapshot: indMeta.price_pln, duration_min_snapshot: indMeta.duration_min,
        });
    }
    // Today group class: Modern/Jazz 17:00
    if (modernJazzId) {
      const slot = groupSlot(0, 17, modernJazzMeta);
      for (const ci of [6, 5, 1]) {
        const cust = DANCE_CUSTOMERS[ci];
        bookingRows.push({
          tenant_id: tenantId, service_id: modernJazzId, staff_id: null,
          customer_name: cust[0], customer_phone: cust[1], customer_email: cust[2] ?? null,
          starts_at: slot.starts, ends_at: slot.ends, status: "confirmed",
          price_pln_snapshot: modernJazzMeta.price_pln, duration_min_snapshot: modernJazzMeta.duration_min,
        });
      }
    }

    // ── Upcoming (next 7 days) ───────────────────────────────────────────────
    const upcomingInd = [
      { dayOffset: 1, hour: 10, staffIdx: 1, custIdx: 0 },  // Liza
      { dayOffset: 2, hour: 11, staffIdx: 7, custIdx: 3 },  // Natalia N.
      { dayOffset: 3, hour: 10, staffIdx: 2, custIdx: 2 },  // Vadim
    ];
    for (const { dayOffset, hour, staffIdx, custIdx } of upcomingInd) {
      const slot = warsawSlot(dayOffset, hour);
      const cust = DANCE_CUSTOMERS[custIdx];
      if (indId)
        bookingRows.push({
          tenant_id: tenantId, service_id: indId, staff_id: staffIds[staffIdx],
          customer_name: cust[0], customer_phone: cust[1], customer_email: cust[2] ?? null,
          starts_at: slot.starts, ends_at: slot.ends, status: "confirmed",
          price_pln_snapshot: indMeta.price_pln, duration_min_snapshot: indMeta.duration_min,
        });
    }
    // Upcoming group classes
    const upcomingGroups = [
      { dayOffset: 1, hour: 17, meta: hipHopMeta, id: hipHopId,         custs: [8, 10, 7] },
      { dayOffset: 4, hour: 16, meta: towarzyskiMeta, id: towarzyskiId, custs: [9, 4] },
      { dayOffset: 5, hour: 10, meta: mixMeta, id: mixId,               custs: [12, 11] },
    ];
    for (const { dayOffset, hour, meta, id, custs } of upcomingGroups) {
      if (!id) continue;
      const slot = groupSlot(dayOffset, hour, meta);
      for (const ci of custs) {
        const cust = DANCE_CUSTOMERS[ci];
        bookingRows.push({
          tenant_id: tenantId, service_id: id, staff_id: null,
          customer_name: cust[0], customer_phone: cust[1], customer_email: cust[2] ?? null,
          starts_at: slot.starts, ends_at: slot.ends, status: "confirmed",
          price_pln_snapshot: meta.price_pln, duration_min_snapshot: meta.duration_min,
        });
      }
    }
  } else if (variant === "joga") {
    // Group bookings: multiple customers per slot
    // Typical yoga schedule: 7:00, 9:00, 17:00, 19:00
    const CLASS_HOURS = [7, 9, 17, 19];
    // Extended sample names for group classes
    const GROUP_NAMES = [
      ["Anna Kowalska",      "+48500100201", "anna@example.com"],
      ["Marta Nowak",        "+48500100202", "marta@example.com"],
      ["Katarzyna Wiśniewska","+48500100203", null],
      ["Ewa Lewandowska",    "+48500100204", "ewa@example.com"],
      ["Joanna Wójcik",      "+48500100205", null],
      ["Aleksandra Kamińska","+48500100206", "ola@example.com"],
      ["Natalia Kowalczyk",  "+48500100207", null],
      ["Monika Zielińska",   "+48500100208", "monika@example.com"],
    ] as const;

    // One booking per slot, each pinned to an instructor.
    //
    // This used to stack 40–75% of max_participants on a single slot with
    // staff_id null, to look like a filled class. The exclusion constraint
    // no_overlap_no_staff forbids that — two unassigned bookings may not
    // share a range — so every joga demo shipped with an empty calendar.
    // Per-slot capacity was removed in 410e545, so there is nothing to
    // reinstate here; one booking per slot is what the schema supports.
    let custIdx = 0;
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      for (const [hourIdx, hour] of CLASS_HOURS.entries()) {
        const sv = serviceList[(dayOffset * CLASS_HOURS.length + hourIdx) % serviceList.length];
        const meta = serviceMeta.get(sv.slug)!;
        const cust = GROUP_NAMES[custIdx % GROUP_NAMES.length];
        custIdx++;
        const starts = new Date(date);
        starts.setHours(hour, 0, 0, 0);
        bookingRows.push({
          tenant_id: tenantId,
          service_id: sv.id,
          // Rotate instructors so the week view shows every column in use.
          staff_id: staffIds[custIdx % staffIds.length],
          customer_name: cust[0],
          customer_phone: cust[1],
          customer_email: cust[2] ?? null,
          starts_at: starts.toISOString(),
          ends_at: new Date(starts.getTime() + meta.duration_min * 60_000).toISOString(),
          status: "confirmed",
          price_pln_snapshot: meta.price_pln,
          duration_min_snapshot: meta.duration_min,
        });
      }
    }
  } else {
    // Individual bookings (barber / kosmetyka)
    const slotsThisDay = [10, 12, 14, 16];
    let count = 0;
    for (let dayOffset = 0; dayOffset < 7 && count < 12; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dow = date.getDay();
      if (dow === 0) continue; // closed Sunday
      for (const hour of slotsThisDay) {
        if (count >= 12) break;
        const sv = serviceList[count % serviceList.length];
        const meta = serviceMeta.get(sv.slug)!;
        const cust = SAMPLE_NAMES[count % SAMPLE_NAMES.length];
        const staffId = staffIds[count % staffIds.length];
        const starts = new Date(date);
        starts.setHours(hour, 0, 0, 0);
        const ends = new Date(starts.getTime() + meta.duration_min * 60_000);
        bookingRows.push({
          tenant_id: tenantId,
          service_id: sv.id,
          staff_id: staffId,
          customer_name: cust[0],
          customer_phone: cust[1],
          customer_email: cust[2],
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
          status: "confirmed",
          price_pln_snapshot: meta.price_pln,
          duration_min_snapshot: meta.duration_min,
        });
        count++;
      }
    }
  }

  if (bookingRows.length) {
    const { error } = await supabase.from("bookings").insert(bookingRows);
    // The insert is atomic, so one bad row empties the whole demo calendar.
    // This went unnoticed for months on the joga variant: it stacked several
    // participants on one slot with staff_id null, which the exclusion
    // constraint no_overlap_no_staff rejects (23P01), and the demo shipped
    // with an empty schedule. Never swallow this again.
    if (error) {
      console.error(
        `[demo-seed] bookings insert failed for variant "${variant}" — the demo will have an empty calendar:`,
        error.message
      );
    }
  }
}
