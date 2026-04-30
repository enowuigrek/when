import { getSettings, getAllTimeFilters } from "@/lib/db/settings";
import { getBusinessHours } from "@/lib/db/services";
import { getAdminTenantSlug } from "@/lib/tenant";
import { SettingsForm } from "./settings-form";
import { FiltersSection } from "./filters-section";
import { HoursSection } from "./hours-section";
import { EmbedSnippet } from "./embed-snippet";
import { PushNotifyButton } from "@/components/push-notify-button";

export const metadata = {
  title: "Ustawienia",
  robots: { index: false },
};

export default async function UstawieniaPage() {
  const [settings, filters, hours, tenantSlug] = await Promise.all([
    getSettings(),
    getAllTimeFilters(),
    getBusinessHours(),
    getAdminTenantSlug(),
  ]);

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

      <hr className="my-10 border-zinc-800/60" />

      <h2 className="text-lg font-semibold tracking-tight">Godziny otwarcia</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Ustaw godziny i dni działalności. Klienci nie będą mogli rezerwować poza tymi godzinami.
      </p>

      <div className="mt-6">
        <HoursSection hours={hours} />
      </div>

      <hr className="my-10 border-zinc-800/60" />

      <h2 className="text-lg font-semibold tracking-tight">Powiadomienia push</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Otrzymuj powiadomienie na telefon lub komputer gdy klient złoży rezerwację.
        Działa bez aplikacji — przez przeglądarkę.
      </p>
      <div className="mt-5">
        <PushNotifyButton />
        <p className="mt-3 text-xs text-zinc-600">
          Aktywuj na każdym urządzeniu osobno. Na iOS: Safari → Udostępnij → Dodaj do ekranu głównego,
          potem otwórz panel z ikony i włącz tu powiadomienia.
        </p>
      </div>

      <hr className="my-10 border-zinc-800/60" />

      <h2 className="text-lg font-semibold tracking-tight">Subdomena i embed widget</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Twój widget jest dostępny pod własną subdomeną lub możesz go osadzić na swojej stronie.
      </p>

      {/* Subdomain info */}
      <div className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-200">Twój link do rezerwacji</p>
            <p className="mt-0.5 text-xs text-zinc-500">Gotowy adres do wysyłania klientom — bez osadzania na stronie.</p>
          </div>
          <a
            href={`https://${tenantSlug}.whenbooking.pl`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            ↗ Otwórz
          </a>
        </div>
        <p className="font-mono text-sm text-[var(--color-accent)]">
          https://{tenantSlug}.whenbooking.pl
        </p>
        <p className="text-xs text-zinc-600">
          Subdomena jest automatycznie aktywna — nie wymaga konfiguracji. Możesz ją wysłać klientom lub dodać jako link na swojej stronie.
        </p>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-medium text-zinc-300">Osadź na własnej stronie</p>
        <EmbedSnippet tenantSlug={tenantSlug} />
      </div>
    </div>
  );
}
