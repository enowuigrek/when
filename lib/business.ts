// Static constants only — business data lives in Supabase `settings` table.
// Edit via admin panel: /admin/ustawienia

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
