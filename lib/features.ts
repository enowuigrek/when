/**
 * Capabilities a tenant's WHEN has switched on.
 *
 * The product is not one shape. A barber needs two people and a chair; a dance
 * school needs packages; a pracownia plastyczna needs recurring groups and no
 * staff at all. Shipping the union of all of them to everyone turns each
 * panel into somebody else's business plus your own.
 *
 * So each capability lives in the codebase once and is switched on per tenant.
 * The flag governs what is *offered* — which tabs exist, which pages answer.
 * It never governs what already exists: a service sold as a package stays a
 * package whichever way the flags are set, because hiding a counter would not
 * unsell what somebody bought.
 *
 * Adding one is a string here and the code that reads it. No migration.
 *
 * Only capabilities that actually switch a piece of the panel belong here.
 * Three were on this list and read by nothing. "karnety" and "cena-od-osoby"
 * are already decided by data — a service with `total_lessons` is a package,
 * one with `price_per_person` is priced per head — and a flag repeating the
 * data is a second source of truth and the first thing to drift. "platnosci"
 * had no panel to switch: payments are configured per service and the form
 * does not show them yet. All three are gone rather than kept as promises;
 * a name comes back the day something reads it.
 *
 * Tenants may still carry the retired names in their column. Unknown names
 * are ignored, so nothing has to be migrated to catch up.
 */
export const FEATURES = {
  pracownicy: "Pracownicy",
  grupy: "Zajęcia grupowe",
} as const;

export type Feature = keyof typeof FEATURES;

const KNOWN = new Set(Object.keys(FEATURES) as Feature[]);

/**
 * The tenant's list, narrowed to names this build understands.
 *
 * Unknown names are dropped rather than rejected: a column written by a newer
 * deploy must not throw in an older one, and a typo in a seed should cost that
 * one capability, not the whole panel.
 */
export function featuresOf(raw: readonly string[] | null | undefined): Set<Feature> {
  const out = new Set<Feature>();
  for (const name of raw ?? []) {
    if (KNOWN.has(name as Feature)) out.add(name as Feature);
  }
  return out;
}

export function hasFeature(
  features: ReadonlySet<Feature> | readonly string[] | null | undefined,
  feature: Feature
): boolean {
  if (!features) return false;
  return features instanceof Set
    ? features.has(feature)
    : (features as readonly string[]).includes(feature);
}
