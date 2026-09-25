/**
 * Wording for services sold as a package of lessons.
 *
 * A package's price covers several lessons, so a card showing only "840 zł"
 * and "60 min" misleads on both counts. The owner may leave the description
 * empty, so the lesson count has to come from the data, not from prose.
 */

/** 1 lekcja, 2 lekcje, 5 lekcji — Polish counts the small numbers apart. */
export function lessonsLabel(n: number): string {
  if (n === 1) return "1 lekcja";
  const last = n % 10;
  const teens = n % 100;
  const few = last >= 2 && last <= 4 && !(teens >= 12 && teens <= 14);
  return `${n} ${few ? "lekcje" : "lekcji"}`;
}

/** The small print under a service name: "60 min", or "5 lekcji × 60 min". */
export function serviceMeta(s: { duration_min: number; total_lessons: number | null }): string {
  return s.total_lessons
    ? `${lessonsLabel(s.total_lessons)} × ${s.duration_min} min`
    : `${s.duration_min} min`;
}

/**
 * The price as it should be read: "65 zł / dziecko", not "65 zł".
 *
 * A per-head rate shown bare is the single most misleading number a booking
 * page can print — a parent reads 65 and budgets 65 for a party of nine.
 */
export function priceLabel(s: {
  price_pln: number;
  price_per_person: boolean;
  participants_label: string | null;
}): string {
  if (!s.price_per_person) return `${s.price_pln} zł`;
  // "Liczba dzieci" → "dziecko". Falls back to a neutral word for anything
  // this does not recognise, rather than guessing at Polish declension.
  const unit = (s.participants_label ?? "").toLowerCase().includes("dzieci") ? "dziecko" : "osobę";
  return `${s.price_pln} zł / ${unit}`;
}
