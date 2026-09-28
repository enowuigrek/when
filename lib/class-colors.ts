/**
 * The colours a class can be drawn in.
 *
 * A rainbow, because the first studio to run classes is called Tęczówka — and
 * because seven clearly different hues is about as many as a week of classes
 * can hold before two of them start to look alike. A fixed set rather than a
 * free colour picker: every one of these has been chosen to work as a border
 * on both themes and as a solid fill with readable text on it.
 */
export const CLASS_COLORS = [
  { hex: "#EF4444", label: "Czerwony" },
  { hex: "#F97316", label: "Pomarańczowy" },
  { hex: "#EAB308", label: "Żółty" },
  { hex: "#22C55E", label: "Zielony" },
  { hex: "#3B82F6", label: "Niebieski" },
  { hex: "#6366F1", label: "Indygo" },
  { hex: "#A855F7", label: "Fioletowy" },
] as const;

const HEX = /^#[0-9a-fA-F]{6}$/;

// Spread apart rather than in rainbow order, so the first three courses do not
// come out red, orange and yellow — three neighbours that read as one warm
// smear on a busy week.
const FALLBACK = [1, 4, 3, 6, 0, 2, 5];

/**
 * The colour a class is drawn in.
 *
 * Its own, when the owner has chosen one. Otherwise one derived from its
 * place in the list, so a studio that never opens the setting still sees its
 * courses apart — and the same course is the same colour on every screen,
 * because the order it depends on belongs to the service, not to the page.
 */
export function classColor(service: { color?: string | null; sort_order: number }): string {
  if (service.color && HEX.test(service.color)) return service.color;
  const i = Math.max(0, service.sort_order - 1) % FALLBACK.length;
  return CLASS_COLORS[FALLBACK[i]].hex;
}

export function isClassColor(hex: string): boolean {
  return CLASS_COLORS.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
}

/** WCAG relative luminance of "#rrggbb". */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white, whichever reads better on a solid fill of this colour. */
export function textOn(hex: string): string {
  const l = luminance(hex);
  const onWhite = 1.05 / (l + 0.05);
  const onBlack = (l + 0.05) / 0.05;
  return onBlack >= onWhite ? "#09090b" : "#ffffff";
}

/** The colour thinned out over whatever is behind it — a fill that is not yet a fill. */
export function tint(hex: string, percent: number): string {
  return `color-mix(in srgb, ${hex} ${percent}%, transparent)`;
}

/**
 * For each weekday, the colours of the classes meeting on it, in time order.
 *
 * What the calendars paint: a Monday with two groups is split between their
 * two colours instead of being one tint that says only "something happens".
 * A course with two groups on one day still counts once.
 */
export function weekdayColors(
  groups: { day_of_week: number; start_time: string; service: { color?: string | null; sort_order: number } }[]
): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  const sorted = [...groups].sort((a, b) => a.start_time.localeCompare(b.start_time));
  for (const g of sorted) {
    const c = classColor(g.service);
    const list = (out[g.day_of_week] ??= []);
    if (!list.includes(c)) list.push(c);
  }
  return out;
}
