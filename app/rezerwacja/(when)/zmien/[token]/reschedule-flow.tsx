"use client";

import { useState, useTransition } from "react";
import type { Slot } from "@/lib/slots";
import type { TimeFilter } from "@/lib/db/settings";
import { CalendarPicker } from "@/components/calendar-picker";
import { TimeFilterBar, applyTimeFilter } from "@/components/booking/time-filter-bar";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";
import { rescheduleBookingAction } from "./actions";

async function fetchSlots(serviceSlug: string, date: string, staffId?: string | null): Promise<{ ok: true; slots: Slot[] } | { ok: false; message: string }> {
  const params = new URLSearchParams({ service: serviceSlug, date });
  if (staffId) params.set("staff", staffId);
  const res = await fetch(`/api/slots?${params}`);
  return res.json();
}

type Day = { date: string; closed: boolean };

export function RescheduleFlow({
  token,
  serviceSlug,
  staffId,
  days,
  initialDate,
  initialSlots,
  timeFilters,
  today,
}: {
  token: string;
  serviceSlug: string;
  staffId?: string | null;
  days: Day[];
  initialDate: string;
  initialSlots: Slot[];
  timeFilters: TimeFilter[];
  today: string;
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loadingSlots, startSlotLoad] = useTransition();
  const [submitting, startSubmit] = useTransition();

  function pickDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setActiveFilter(null);
    startSlotLoad(async () => {
      const res = await fetchSlots(serviceSlug, date, staffId);
      setSlots(res.ok ? res.slots : []);
    });
  }

  const visibleSlots = applyTimeFilter(slots, activeFilter, timeFilters);

  return (
    <div className="mt-8 space-y-10">
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
          Wybierz nowy dzień
        </h2>
        {/* Full width here, unlike the panel's rail: on a booking page the
            service card and the slot grid both span the column, and a calendar
            stopping halfway across looked like it had failed to load. The
            taller cell keeps it from flattening into bars. */}
        <CalendarPicker days={days} selectedDate={selectedDate} onPick={pickDate} today={today} size="lg" />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
            Wolne godziny
          </h2>
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
          filtered={slots.length > 0}
        />
      </div>

      {selectedSlot && (
        <form
          action={rescheduleBookingAction}
          onSubmit={(e) => {
            e.preventDefault();
            startSubmit(() =>
              rescheduleBookingAction(new FormData(e.currentTarget))
            );
          }}
          className="space-y-4"
        >
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="startsAtIso" value={selectedSlot.startsAtIso} />
          <p className="text-sm text-zinc-400">
            Nowy termin:{" "}
            <span className="text-zinc-200">
              {selectedDate} o godz. {selectedSlot.label}
            </span>
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {submitting ? "Zmieniam termin…" : "Potwierdź nowy termin"}
          </button>
        </form>
      )}
    </div>
  );
}
