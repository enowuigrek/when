"use client";

import { useState, useTransition } from "react";
import type { StaffServicePricing } from "@/lib/db/staff";
import { setStaffServicePriceAction } from "../actions";
import { fieldClasses } from "@/components/ui/field";

/**
 * What this person charges, service by service.
 *
 * The price is the only thing editable here — which services they perform is a
 * checklist and lives on the edit form. Leaving a field empty means they charge
 * the base price, which is both the common case and the safe default, so the
 * placeholder shows the base rather than the field pre-filling with it: a
 * pre-filled value would turn every service into an override the first time
 * anyone tabbed through.
 */
export function ServicePrices({
  staffId,
  services,
}: {
  staffId: string;
  services: StaffServicePricing[];
}) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);

  function save(serviceId: string, value: string, previous: string) {
    if (value.trim() === previous.trim()) return;
    const fd = new FormData();
    fd.set("staffId", staffId);
    fd.set("serviceId", serviceId);
    fd.set("price", value);
    start(async () => {
      await setStaffServicePriceAction(fd);
      setSaved(serviceId);
      setTimeout(() => setSaved(null), 1600);
    });
  }

  if (services.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Ta osoba nie ma przypisanych usług. Dodasz je w edycji pracownika.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/20">
      {services.map((s) => {
        const initial = s.ownPricePln === null ? "" : String(s.ownPricePln);
        const diff = s.ownPricePln === null ? 0 : s.ownPricePln - s.basePricePln;
        return (
          <li key={s.serviceId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            {/* Full width on a phone: sharing the row with a fixed-width price
                field left about ten characters for the name, so every service
                read as "Pierwsz…". */}
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <p className={`truncate text-sm ${s.active ? "text-zinc-200" : "text-zinc-500"}`}>
                {s.name}
                {!s.active && <span className="ml-2 text-xs text-zinc-600">ukryta</span>}
              </p>
              <p className="font-mono text-xs text-zinc-500">
                bazowo {s.basePricePln} zł · {s.baseDurationMin} min
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* The difference is what anyone actually wants to read here —
                  "160" says little, "+20" says the whole thing. */}
              {diff !== 0 && (
                <span className={`font-mono text-xs ${diff > 0 ? "text-[var(--color-accent)]" : "text-zinc-400"}`}>
                  {diff > 0 ? "+" : "−"}{Math.abs(diff)} zł
                </span>
              )}
              {saved === s.serviceId && <span className="text-xs text-emerald-400">zapisano</span>}
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Cena — {s.name}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  defaultValue={initial}
                  placeholder={String(s.basePricePln)}
                  disabled={pending}
                  onBlur={(e) => save(s.serviceId, e.currentTarget.value, initial)}
                  className={fieldClasses({ size: "sm", className: "w-24 text-right font-mono" })}
                />
                <span className="text-xs text-zinc-500">zł</span>
              </label>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
