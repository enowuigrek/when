/**
 * The days of the week, in Polish, once.
 *
 * They had been written out six times: twice in lib, twice in components and
 * twice inside pages, in three different spellings — "Sb" in one list and
 * "So" in another, "Cz" beside "czw". A weekday is not a per-page decision,
 * and a schedule whose Saturday disagrees with the timetable's Saturday reads
 * as two products stitched together.
 *
 * Two orderings live here because two are genuinely needed. Arrays indexed by
 * `getDay()` start on Sunday, because that is the number Postgres and
 * JavaScript both hand over. Anything a person reads starts on Monday,
 * because that is how a Polish week is written and how the studio's own
 * printed timetable is laid out. Keeping both named and adjacent is what
 * stops the next caller from quietly inventing a third.
 */

/** Indexed by `getDay()`: 0 = Niedziela. */
export const WEEKDAY_NAMES = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
] as const;

/** Indexed by `getDay()`. Two letters, so a column header fits on a phone. */
export const WEEKDAY_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"] as const;

/**
 * Monday first, Sunday last — reading order.
 *
 * Typed as plain `number[]` rather than a readonly tuple so that `indexOf`
 * takes a day number without a cast. It was being called as
 * `indexOf(day as never)`, which is a cast that silences the compiler
 * without making anything safer.
 */
export const WEEK_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

/** Column headers for a Monday-first calendar grid. */
export const WEEK_ORDER_SHORT: readonly string[] = WEEK_ORDER.map((d) => WEEKDAY_SHORT[d]);

/**
 * The plural: niedziele, poniedziałki, wtorki…
 *
 * Both places that needed it built it by sticking an "i" on the singular,
 * which gives "piąteki", "środai" and "poniedziałeki" — every one of the
 * seven wrong, on the parent's enrolment screen and again on the
 * confirmation. Polish does not decline by concatenation; the seven forms
 * are written out because there are only seven.
 */
export const WEEKDAY_PLURAL = [
  "niedziele",
  "poniedziałki",
  "wtorki",
  "środy",
  "czwartki",
  "piątki",
  "soboty",
] as const;

/**
 * "w piątki", "we wtorki" — how you say a class repeats on that day.
 *
 * Tuesday takes "we" rather than "w": Polish inserts the vowel where the
 * preposition would otherwise collide with the same consonant starting the
 * word. It is one exception, and spelling it out here keeps it out of the
 * two sentences that need the phrase.
 */
export function everyWeekday(dayOfWeek: number): string {
  const plural = WEEKDAY_PLURAL[dayOfWeek];
  return `${plural.startsWith("w") ? "we" : "w"} ${plural}`;
}
