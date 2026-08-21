"use client";

import { useActionState, useState, useTransition, useEffect, useRef } from "react";
import { sectionHeading } from "@/components/ui/surface";
import type { Slot } from "@/lib/slots";
import type { Service } from "@/lib/types";
import type { Staff } from "@/lib/db/staff";
import type { TimeFilter } from "@/lib/db/settings";
import type { Customer } from "@/lib/db/customers";
import { CalendarPicker } from "@/components/calendar-picker";
import { Button, ButtonLink } from "@/components/ui/button";
import { StaffPicker } from "@/components/booking/staff-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { TimeFilterBar, applyTimeFilter } from "@/components/booking/time-filter-bar";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";
import { useAdminBase } from "@/lib/use-admin-base";
import { serviceMeta } from "@/lib/service-label";
import {
  getAdminSlotsForDate,
  createAdminBookingAction,
  searchCustomersAction,
  type AdminBookingState,
} from "./actions";

type Day = { date: string; closed: boolean };

const inp =
  "w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50";

export function AdminBookingForm({
  services,
  staff,
  days,
  initialDate,
  initialSlots,
  timeFilters,
  today,
  prefilledTime,
  prefilledPhone,
  prefilledName,
  prefilledEmail,
}: {
  services: Service[];
  staff: Staff[];
  days: Day[];
  initialDate: string;
  initialSlots: Slot[];
  timeFilters: TimeFilter[];
  granularityMin: number;
  today: string;
  prefilledTime?: string | null;
  prefilledPhone?: string | null;
  prefilledName?: string | null;
  prefilledEmail?: string | null;
}) {
  const adminBase = useAdminBase();
  const [state, formAction, formPending] = useActionState<AdminBookingState, FormData>(
    createAdminBookingAction,
    { status: "idle" }
  );

  // Customer search
  const [phone, setPhone] = useState(prefilledPhone ?? "");
  const [customerName, setCustomerName] = useState(prefilledName ?? "");
  const [customerEmail, setCustomerEmail] = useState(prefilledEmail ?? "");
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const nameSuggestionsRef = useRef<HTMLDivElement>(null);

  // Booking selections
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? "");
  // With one person on the books there is nobody to choose between, so the
  // step is not shown — and the booking is theirs from the start rather than
  // going in as "anybody" and being resolved on the server.
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    staff.length === 1 ? staff[0].id : ""
  ); // "" = any
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(() =>
    prefilledTime ? (initialSlots.find((s) => s.label === prefilledTime) ?? null) : null
  );
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loadingSlots, startSlotLoad] = useTransition();

  // The customer book, searched from whichever field is being typed: someone
  // ringing up gives a name as readily as a number, and looking only at the
  // phone meant a name typed in full found nobody and quietly created a second
  // row for a customer already on the books.
  const [source, setSource] = useState<"phone" | "name" | null>(null);
  useEffect(() => {
    const query = source === "phone" ? phone : source === "name" ? customerName : "";
    if (!source || query.trim().length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      const results = await searchCustomersAction(query.trim());
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [phone, customerName, source]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Two fields can carry the list now, so a click only counts as "outside"
      // when it misses both.
      const target = e.target as Node;
      const inside =
        suggestionsRef.current?.contains(target) ||
        nameSuggestionsRef.current?.contains(target);
      if (!inside) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function selectCustomer(c: Customer) {
    setPhone(c.phone);
    setCustomerName(c.name);
    setCustomerEmail(c.email ?? "");
    setShowSuggestions(false);
    setSource(null);
  }

  function loadSlots(serviceId: string, date: string, staffId: string) {
    setSelectedSlot(null);
    startSlotLoad(async () => {
      const res = await getAdminSlotsForDate(serviceId, date, staffId || undefined);
      setSlots(res.ok ? res.slots : []);
    });
  }

  function pickService(id: string) {
    setSelectedServiceId(id);
    loadSlots(id, selectedDate, selectedStaffId);
  }

  function pickStaff(id: string) {
    setSelectedStaffId(id);
    loadSlots(selectedServiceId, selectedDate, id);
  }

  function pickDate(date: string) {
    setSelectedDate(date);
    setActiveFilter(null);
    loadSlots(selectedServiceId, date, selectedStaffId);
  }

  const visibleSlots = applyTimeFilter(slots, activeFilter, timeFilters);

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;
  const selectedStaff = staff.find((s) => s.id === selectedStaffId) ?? null;
  const err = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <div className="space-y-8">

      {/* STEP 1 — CUSTOMER SEARCH */}
      <div>
        <p className={`mb-3 ${sectionHeading}`}>1 · Klient</p>
        <div className="space-y-3">
          <div className="relative" ref={suggestionsRef}>
            <label className="mb-1.5 block text-sm text-zinc-400">Telefon *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setSource("phone"); }}
              placeholder="np. +48 600 100 200"
              className={inp}
              autoComplete="off"
            />
            {showSuggestions && source === "phone" && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-zinc-800"
                  >
                    <span className="font-medium text-zinc-100">{c.name}</span>
                    <span className="font-mono text-xs text-zinc-500">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative" ref={nameSuggestionsRef}>
              <label className="mb-1.5 block text-sm text-zinc-400">Imię i nazwisko *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setSource("name"); }}
                className={inp}
                autoComplete="off"
              />
              {showSuggestions && source === "name" && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                  {suggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-zinc-800"
                    >
                      <span className="truncate font-medium text-zinc-100">{c.name}</span>
                      <span className="shrink-0 font-mono text-xs text-zinc-500">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-zinc-400">Email (opcjonalny)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className={inp}
              />
            </div>
          </div>
          {(err.customerPhone || err.customerName) && (
            <p className="text-xs text-red-400">{err.customerPhone ?? err.customerName}</p>
          )}
        </div>
      </div>

      {/* STEP 2 — SERVICE */}
      <div>
        <p className={`mb-3 ${sectionHeading}`}>2 · Usługa</p>
        {services.length === 0 && (
          <EmptyState
            title="Nie ma jeszcze żadnej usługi."
            hint="Rezerwacja zawsze dotyczy usługi — dodaj pierwszą, żeby móc umawiać."
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => {
            const isSelected = s.id === selectedServiceId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pickService(s.id)}
                className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-medium leading-tight ${isSelected ? "text-zinc-100" : "text-zinc-200"}`}>
                    {s.name}
                  </p>
                  {s.description && (
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{s.description}</p>
                  )}
                  <p className="mt-1 font-mono text-xs text-zinc-500">{serviceMeta(s)}</p>
                </div>
                <div className={`shrink-0 font-mono text-lg font-semibold ${isSelected ? "text-[var(--color-accent)]" : "text-zinc-400"}`}>
                  {s.price_pln} zł
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3 — STAFF (only if there is a choice to make) */}
      {staff.length > 1 && (
        <div>
          <p className={`mb-3 ${sectionHeading}`}>3 · Pracownik</p>
          <StaffPicker staff={staff} selectedStaffId={selectedStaffId} onPick={pickStaff} />
        </div>
      )}

      {/* STEP 4 — CALENDAR */}
      <div>
        <p className={`mb-3 ${sectionHeading}`}>
          {staff.length > 1 ? "4" : "3"} · Dzień
        </p>
        {/* Capped, like the calendar in the schedule and the roster. Left to
            fill this form it stretched to 780px and the day cells turned into
            wide rectangles — the same component, no longer reading as a
            calendar. A little wider than the rail's 320 for touch. */}
        <div className="max-w-[26rem]">
          <CalendarPicker days={days} selectedDate={selectedDate} onPick={pickDate} today={today} />
        </div>
      </div>

      {/* STEP 5 — SLOTS */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className={sectionHeading}>
            {staff.length > 1 ? "5" : "4"} · Godzina
          </p>
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
        {err.startsAtIso && <p className="mt-2 text-xs text-red-400">{err.startsAtIso}</p>}
      </div>

      {/* CONFIRMATION + SUBMIT */}
      {selectedSlot && (
        <form action={formAction} className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {selectedStaff && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedStaff.color }} />
                <span className="text-zinc-300">{selectedStaff.name}</span>
              </span>
            )}
            <span className="text-zinc-400">{selectedService?.name}</span>
            <span className="text-[var(--color-accent)] font-medium">
              {selectedDate} · {selectedSlot.label}
            </span>
            {selectedService && (
              <span className="text-zinc-600">({selectedService.duration_min} min)</span>
            )}
          </div>

          {/* Hidden fields */}
          <input type="hidden" name="serviceId" value={selectedServiceId} />
          <input type="hidden" name="startsAtIso" value={selectedSlot.startsAtIso} />
          <input type="hidden" name="staffId" value={selectedStaffId} />
          <input type="hidden" name="customerPhone" value={phone} />
          <input type="hidden" name="customerName" value={customerName} />
          <input type="hidden" name="customerEmail" value={customerEmail} />

          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">Uwagi</label>
            <textarea name="notes" rows={2} className={inp} />
          </div>

          {state.status === "error" && !Object.keys(err).length && (
            <p className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
              {state.message}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              variant="primary"
              radius="full"
              disabled={formPending || !phone || !customerName}
              className="px-5 py-2.5"
            >
              {formPending ? "Rezerwuję…" : "Dodaj rezerwację"}
            </Button>
            <ButtonLink href={`${adminBase}/harmonogram`} variant="secondary" radius="full" className="px-5 py-2.5">
              Anuluj
            </ButtonLink>
          </div>
        </form>
      )}

      {!selectedSlot && (
        <ButtonLink href={adminBase} variant="secondary" radius="full" className="px-5 py-2.5">
          Anuluj
        </ButtonLink>
      )}
    </div>
  );
}
