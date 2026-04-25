"use client";

import { useActionState, useState } from "react";
import { createAdminBookingAction, type AdminBookingState } from "./actions";
import type { Service, BusinessHours } from "@/lib/types";
import { warsawToday } from "@/lib/slots";

export function AdminBookingForm({
  services,
  hours,
}: {
  services: Service[];
  hours: BusinessHours[];
}) {
  const [state, action, pending] = useActionState<AdminBookingState, FormData>(
    createAdminBookingAction,
    { status: "idle" }
  );
  const [selectedService, setSelectedService] = useState<Service | null>(
    services[0] ?? null
  );

  const today = warsawToday();

  // Figure out min/max datetime for the picker based on business hours.
  const minDatetime = `${today}T00:00`;

  function err(field: string) {
    return state.status === "error" ? state.fieldErrors?.[field] : undefined;
  }

  return (
    <form action={action} className="space-y-5">
      {/* Service picker */}
      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">
          Usługa <span className="text-[var(--color-accent)]">*</span>
        </span>
        <select
          name="serviceId"
          required
          onChange={(e) => {
            const s = services.find((s) => s.id === e.target.value) ?? null;
            setSelectedService(s);
            // Also update hidden slug field.
            const slugInput = e.target.form?.elements.namedItem("serviceSlug") as HTMLInputElement;
            if (slugInput && s) slugInput.value = s.slug;
          }}
          defaultValue={selectedService?.id ?? ""}
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.duration_min} min · {s.price_pln} zł
            </option>
          ))}
        </select>
        <input type="hidden" name="serviceSlug" defaultValue={selectedService?.slug ?? ""} />
        {err("serviceId") && <span className="mt-1 block text-xs text-red-400">{err("serviceId")}</span>}
      </label>

      {/* Date + time */}
      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">
          Data i godzina <span className="text-[var(--color-accent)]">*</span>
        </span>
        {selectedService && (
          <p className="mb-1 text-xs text-zinc-500">
            Czas trwania: {selectedService.duration_min} min
            {selectedService.duration_min >= 60
              ? ` (${Math.floor(selectedService.duration_min / 60)}h${selectedService.duration_min % 60 ? ` ${selectedService.duration_min % 60}min` : ""})`
              : ""}
          </p>
        )}
        <input
          type="datetime-local"
          name="startsAt"
          required
          min={minDatetime}
          step={900}
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
        />
        {err("startsAt") && <span className="mt-1 block text-xs text-red-400">{err("startsAt")}</span>}
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-300">
            Imię i nazwisko <span className="text-[var(--color-accent)]">*</span>
          </span>
          <input
            type="text"
            name="customerName"
            required
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
          />
          {err("customerName") && <span className="mt-1 block text-xs text-red-400">{err("customerName")}</span>}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-300">
            Telefon <span className="text-[var(--color-accent)]">*</span>
          </span>
          <input
            type="tel"
            name="customerPhone"
            required
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
          />
          {err("customerPhone") && <span className="mt-1 block text-xs text-red-400">{err("customerPhone")}</span>}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">
          Email <span className="text-zinc-500">(opcjonalny)</span>
        </span>
        <input
          type="email"
          name="customerEmail"
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">Uwagi</span>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
        />
      </label>

      {state.status === "error" && (
        <p className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {pending ? "Rezerwuję…" : "Dodaj rezerwację"}
        </button>
        <a
          href="/admin"
          className="rounded-full border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
        >
          Anuluj
        </a>
      </div>
    </form>
  );
}
