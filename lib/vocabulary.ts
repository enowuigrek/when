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
export type EnrollVocabulary = {
  /** Label of the field naming the person attending. */
  enrollee: string;
  /** Label of the guardian field, or null when the service has no guardian. */
  guardian: string | null;
  /** The button that adds somebody to a group. */
  action: string;
  /** Prefix written into the booking's notes for the guardian. */
  guardianNote: string;
};

export function enrollVocabulary(service: {
  enrollee_label: string | null;
  guardian_label: string | null;
  enroll_action_label: string | null;
}): EnrollVocabulary {
  const guardian = service.guardian_label?.trim() || null;
  return {
    enrollee: service.enrollee_label?.trim() || "Imię i nazwisko",
    guardian,
    action: service.enroll_action_label?.trim() || "Dopisz uczestnika",
    // The note keeps the tenant's own word so the owner reads "Rodzic/opiekun"
    // where that is what they call it, and something neutral where it is not.
    guardianNote: guardian ?? "Opiekun",
  };
}

/** What this tenant calls its recurring groups: the tab, the section, the heading. */
export function classesLabel(settings: { classes_label?: string | null }): string {
  return settings.classes_label?.trim() || "Zajęcia";
}
