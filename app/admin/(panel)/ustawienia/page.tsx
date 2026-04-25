import { getSettings, getAllTimeFilters } from "@/lib/db/settings";
import { SettingsForm } from "./settings-form";
import { FiltersSection } from "./filters-section";

export const metadata = {
  title: "Ustawienia",
  robots: { index: false },
};

export default async function UstawieniaPage() {
  const [settings, filters] = await Promise.all([getSettings(), getAllTimeFilters()]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ustawienia</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Dane firmy widoczne na stronie i w mailach do klientów.
      </p>

      <div className="mt-8">
        <SettingsForm settings={settings} />
      </div>

      <hr className="my-10 border-zinc-800/60" />

      <h2 className="text-lg font-semibold tracking-tight">Filtry czasu</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Skróty widoczne przy rezerwacji: Rano, Południe, Wieczór itp.
      </p>

      <div className="mt-6">
        <FiltersSection filters={filters} />
      </div>
    </div>
  );
}
