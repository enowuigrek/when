/**
 * What a business calls the people it teaches.
 *
 * "Dopisz dziecko" fits a pracownia plastyczna and insults a dance school for
 * adults. The words were written into the forms, the buttons and the note text
 * alike, so switching industry meant editing code.
 *
 * These are whole labels, not a noun the system declines. Polish does not
 * survive automatic inflection, and the pattern already works elsewhere —
 * `participants_label` holds "Liczba dzieci", not "dziecko".
 *
 * Every field is optional; left unset a service gets neutral wording that
 * reads correctly for anyone.
 */
/** What the enrolment screens call the people they sign up. */
export type EnrollWords = { enrollee: string; action: string };

export type EnrollVocabulary = {
  /** Label of the field naming the person attending. */
  enrollee: string;
  /** The button that adds somebody to a group. */
  action: string;
};

export function enrollVocabulary(service: {
  enrollee_label: string | null;
  enroll_action_label: string | null;
}): EnrollVocabulary {
  return {
    enrollee: service.enrollee_label?.trim() || "Imię i nazwisko",
    action: service.enroll_action_label?.trim() || "Dopisz uczestnika",
  };
}

/** What this tenant calls its recurring groups: the tab, the section, the heading. */
export function classesLabel(settings: { classes_label?: string | null }): string {
  return settings.classes_label?.trim() || "Zajęcia";
}

/**
 * What the panel's main action is called.
 *
 * A salon takes bookings; a studio signs children up for classes. Naming the
 * button after the trade is the difference between a panel that reads as
 * theirs and one that reads as somebody else's software.
 */
export function newEntryLabel(runsGroups: boolean): { title: string; subtitle: string } {
  return runsGroups
    ? { title: "Nowy zapis", subtitle: "Zapis przez telefon lub wizytę osobistą." }
    : { title: "Nowa rezerwacja", subtitle: "Rezerwacja przez telefon lub wizytę osobistą." };
}
