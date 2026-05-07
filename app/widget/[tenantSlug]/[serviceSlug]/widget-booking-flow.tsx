"use client";

import { useActionState, useState, useTransition } from "react";
import type { Slot } from "@/lib/slots";
import type { TimeFilter } from "@/lib/db/settings";
import { CalendarPicker } from "@/components/calendar-picker";
import { StaffPicker } from "@/components/booking/staff-picker";
import { TimeFilterBar, applyTimeFilter } from "@/components/booking/time-filter-bar";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";
import { submitWidgetBooking } from "./actions";
import type { WidgetBookingState } from "./actions";

type Day = { date: string; closed: boolean };
type StaffOption = { id: string; name: string; color: string };

async function fetchWidgetSlots(
  tenantSlug: string,
  serviceSlug: string,
  date: string,
  staffId: string | null
): Promise<{ ok: true; slots: Slot[] } | { ok: false; message: string }> {
  const params = new URLSearchParams({ tenant: tenantSlug, service: serviceSlug, date });
  if (staffId) params.set("staff", staffId);
  const res = await fetch(`/api/widget/slots?${params}`);
  return res.json();
}

const DOW_PL = ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."];
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const dow = DOW_PL[d.getUTCDay()];
  return `${dow} ${d.getUTCDate()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const inp =
  "w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50";

export function WidgetBookingFlow({
  tenantSlug,
  serviceSlug,
  days,
  initialDate,
  initialSlots,
  timeFilters,
  today,
  staff,
  staffUnavailable,
  isEmbed = false,
  initialStaffId = null,
}: {
  tenantSlug: string;
  serviceSlug: string;
  days: Day[];
  initialDate: string;
  initialSlots: Slot[];
  timeFilters: TimeFilter[];
  today: string;
  staff: StaffOption[];
  staffUnavailable: Record<string, string[]>;
  isEmbed?: boolean;
  initialStaffId?: string | null;
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId ?? "");
  const [loadingSlots, startSlotLoad] = useTransition();

  const [formState, formAction, formPending] = useActionState<WidgetBookingState, FormData>(
    submitWidgetBooking,
    { status: "idle" }
  );

  function reloadSlots(date: string, staffId: string) {
    setSelectedSlot(null);
    setActiveFilter(null);
    startSlotLoad(async () => {
      const res = await fetchWidgetSlots(tenantSlug, serviceSlug, date, staffId || null);
      setSlots(res.ok ? res.slots : []);
    });
  }

  function pickDate(date: string) {
    setSelectedDate(date);
    reloadSlots(date, selectedStaffId);
  }

  function pickStaff(staffId: string) {
    setSelectedStaffId(staffId);
    reloadSlots(selectedDate, staffId);
  }

  const unavailableSet = selectedStaffId ? new Set(staffUnavailable[selectedStaffId] ?? []) : null;
  const daysWithLeave = unavailableSet
    ? days.map((d) => (unavailableSet.has(d.date) ? { ...d, closed: true } : d))
    : days;

  const visibleSlots = applyTimeFilter(slots, activeFilter, timeFilters);

  return (
    <div className="mt-8 space-y-8">
      {/* STAFF */}
      {staff.length > 1 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">Pracownik</p>
          <StaffPicker
            staff={staff}
            selectedStaffId={selectedStaffId}
            onPick={pickStaff}
            unavailableForStaffId={(id) => (staffUnavailable[id] ?? []).includes(selectedDate)}
          />
        </div>
      )}

      {/* CALENDAR */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">Dzień</p>
        <CalendarPicker days={daysWithLeave} selectedDate={selectedDate} onPick={pickDate} today={today} />
      </div>

      {/* SLOTS */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Godzina</p>
          <TimeFilterBar
            filters={timeFilters}
            activeId={activeFilter}
            onToggle={(id) => setActiveFilter(activeFilter === id ? null : id)}
          />
        </div>
        <TimeSlotGrid
          slots={visibleSlots}
          selectedIso={selectedSlot?.startsAtIso ?? null}
          onPick={setSelectedSlot}
          loading={loadingSlots}
          filtered={!!activeFilter && slots.length > 0}
        />
      </div>

      {/* BOOKING FORM — appears when slot selected */}
      {selectedSlot && (
        <form action={formAction} className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
          {/* Selected time summary */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-[var(--color-accent)] font-medium">
              {formatDateLabel(selectedDate)} · {selectedSlot.label}
            </span>
          </div>

          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="serviceSlug" value={serviceSlug} />
          <input type="hidden" name="startsAtIso" value={selectedSlot.startsAtIso} />
          {selectedStaffId && <input type="hidden" name="staffId" value={selectedStaffId} />}
          {isEmbed && <input type="hidden" name="embed" value="1" />}

          <Field
            label="Imię i nazwisko *"
            name="customerName"
            required
            placeholder="Jan Kowalski"
            error={formState.status === "error" ? formState.fieldErrors?.customerName : undefined}
          />
          <Field
            label="Telefon *"
            name="customerPhone"
            type="tel"
            required
            placeholder="+48 600 000 000"
            error={formState.status === "error" ? formState.fieldErrors?.customerPhone : undefined}
          />
          <Field
            label="Email"
            name="customerEmail"
            type="email"
            placeholder="opcjonalnie — do potwierdzenia"
            error={formState.status === "error" ? formState.fieldErrors?.customerEmail : undefined}
          />
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">Uwagi</label>
            <textarea name="notes" rows={2} className={inp} placeholder="Coś, co warto wiedzieć…" />
          </div>

          {formState.status === "error" && (
            <p className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
              {formState.message}
            </p>
          )}

          <button
            type="submit"
            disabled={formPending}
            className="w-full rounded-full bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-[var(--color-accent-fg)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {formPending ? "Rezerwuję…" : "Potwierdź rezerwację"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-zinc-400">{label}</label>
      <input type={type} name={name} required={required} placeholder={placeholder} className={inp} />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
