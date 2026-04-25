// Single source of truth for the demo barber shop.
// To re-skin this MVP for another client, edit this file.

export const business = {
  name: "Brzytwa",
  tagline: "Klasyka i precyzja. Bez pośpiechu.",
  shortDescription:
    "Barber shop dla mężczyzn, którzy wiedzą czego chcą. Strzyżenie, broda, pełen rytuał.",
  address: {
    street: "ul. Mokra 12",
    city: "Wrocław",
    postal: "50-001",
  },
  phone: "+48 600 100 200",
  phoneHref: "tel:+48600100200",
  email: "kontakt@brzytwa.pl",
  instagram: "https://instagram.com/brzytwa",
  mapsUrl: "https://maps.google.com/?q=ul.+Mokra+12,+Wroc%C5%82aw",
  // For booking grid; minutes between candidate slots.
  slotGranularityMin: 15,
  // How many days ahead a customer can book.
  bookingHorizonDays: 21,
} as const;

export const dayLabels = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
] as const;

export const dayLabelsShort = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"] as const;
