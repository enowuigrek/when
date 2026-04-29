import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type DemoVariant = "barber" | "kosmetyka" | "joga";

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

const SETTINGS = {
  barber: {
    business_name: "Demo Barber",
    tagline: "Klasyka, precyzja, bez pośpiechu.",
    description: "Demo konto — wszystkie zmiany znikną po 24h. Pograj tym jak swoim.",
    address_street: "ul. Demo 1",
    address_city: "Warszawa",
    address_postal: "00-001",
    phone: "+48 600 000 000",
    email: "demo@when.app",
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
    email: "demo@when.app",
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
    email: "demo@when.app",
    color_accent: "#7eb89a",
    theme: "light" as const,
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

export async function seedDemoTenant(tenantId: string, variant: DemoVariant): Promise<void> {
  const supabase = createAdminClient();
  const services = variant === "barber" ? BARBER_SERVICES : variant === "kosmetyka" ? KOSMETYKA_SERVICES : JOGA_SERVICES;
  const staff = variant === "barber" ? BARBER_STAFF : variant === "kosmetyka" ? KOSMETYKA_STAFF : JOGA_STAFF;
  const groups = variant === "barber" ? BARBER_GROUPS : variant === "kosmetyka" ? KOSMETYKA_GROUPS : JOGA_GROUPS;
  const settings = SETTINGS[variant];

  // Settings
  await supabase.from("settings").insert({ tenant_id: tenantId, ...settings });

  // Business hours
  const hours = variant === "joga"
    ? [
        { day_of_week: 0, open_time: "08:00", close_time: "20:00", closed: false }, // Niedziela
        { day_of_week: 1, open_time: "07:00", close_time: "21:00", closed: false },
        { day_of_week: 2, open_time: "07:00", close_time: "21:00", closed: false },
        { day_of_week: 3, open_time: "07:00", close_time: "21:00", closed: false },
        { day_of_week: 4, open_time: "07:00", close_time: "21:00", closed: false },
        { day_of_week: 5, open_time: "07:00", close_time: "21:00", closed: false },
        { day_of_week: 6, open_time: "08:00", close_time: "18:00", closed: false }, // Sobota
      ]
    : [
        { day_of_week: 0, open_time: null, close_time: null, closed: true },
        { day_of_week: 1, open_time: "10:00", close_time: "19:00", closed: false },
        { day_of_week: 2, open_time: "10:00", close_time: "19:00", closed: false },
        { day_of_week: 3, open_time: "10:00", close_time: "19:00", closed: false },
        { day_of_week: 4, open_time: "10:00", close_time: "19:00", closed: false },
        { day_of_week: 5, open_time: "10:00", close_time: "19:00", closed: false },
        { day_of_week: 6, open_time: "09:00", close_time: "15:00", closed: false },
      ];
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
  const customerRows = SAMPLE_NAMES.map(([name, phone, email]) => ({
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

  if (variant === "joga") {
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

    let custIdx = 0;
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      for (const hour of CLASS_HOURS) {
        const sv = serviceList[(dayOffset * CLASS_HOURS.length + CLASS_HOURS.indexOf(hour)) % serviceList.length];
        const meta = serviceMeta.get(sv.slug)!;
        const maxSpots = meta.max_participants ?? 12;
        // Fill 40–75% of spots
        const spots = Math.max(2, Math.round(maxSpots * (0.4 + Math.random() * 0.35)));
        const starts = new Date(date);
        starts.setHours(hour, 0, 0, 0);
        const ends = new Date(starts.getTime() + meta.duration_min * 60_000);
        for (let p = 0; p < spots; p++) {
          const cust = GROUP_NAMES[custIdx % GROUP_NAMES.length];
          custIdx++;
          bookingRows.push({
            tenant_id: tenantId,
            service_id: sv.id,
            staff_id: null, // group classes: no staff per booking
            customer_name: cust[0],
            customer_phone: cust[1],
            customer_email: cust[2] ?? null,
            starts_at: starts.toISOString(),
            ends_at: ends.toISOString(),
            status: "confirmed",
            price_pln_snapshot: meta.price_pln,
            duration_min_snapshot: meta.duration_min,
          });
        }
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

  if (bookingRows.length) await supabase.from("bookings").insert(bookingRows);
}
