/**
 * Capabilities a tenant's WHEN has switched on.
 *
 * The product is not one shape. A barber needs two people and a chair; a dance
 * school needs packages; a pracownia plastyczna needs recurring groups and no
 * staff at all. Shipping the union of all of them to everyone turns each
 * panel into somebody else's business plus your own.
 *
 * So each capability lives in the codebase once and is switched on per tenant.
 * The flag governs what is *offered* — which tabs exist, which fields the form
 * asks for. It never governs what already exists: a service sold as a package
 * stays a package whether or not "karnety" is on, because hiding the counter
 * would not unsell it.
 *
 * Adding one is a string here and the code that reads it. No migration.
 */
export const FEATURES = {
  pracownicy: "Pracownicy",
  karnety: "Karnety",
  grupy: "Zajęcia grupowe",
  "cena-od-osoby": "Cena od osoby",
  platnosci: "Płatności online",
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
