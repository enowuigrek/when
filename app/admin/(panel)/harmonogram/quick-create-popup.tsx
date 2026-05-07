"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  createAdminBookingAction,
  searchCustomersAction,
  type AdminBookingState,
} from "@/app/admin/(panel)/rezerwacja/nowa/actions";
import type { ServiceOption } from "@/components/booking-management-modal";
import type { Customer } from "@/lib/db/customers";

type Staff = { id: string; name: string; color: string };

/** Minimum subset of a booking we need for the conflict check. */
type ConflictBooking = {
  id: string;
  staffId: string | null;
  startsAtIso: string;
  endsAtIso: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** YYYY-MM-DD — the day being viewed. */
  date: string;
  /** HH:MM the user clicked. */
  initialStart: string;
  /** Preselected staff (from clicked column). "" = any. */
  initialStaffId: string;
  /**
   * Cap the available service list to those whose duration_min ≤ this value.
   * Set when the user clicked a tight free-time gap (e.g. 10 min between two
   * bookings) — only short services should appear in the dropdown.
   */
  maxDurationMin?: number;
  staff: Staff[];
  services: ServiceOption[];
  /** All bookings for this day — used to flag conflicts. */
  bookingsToday: ConflictBooking[];
  /** Pre-built `?od=...&pracownik=...` so the action redirects back here. */
  returnTo: string;
};

function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}
function fmtMin(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function utcIsoOf(date: string, hm: string): string {
  // Compose Warsaw-local instant → UTC ISO. Handles DST for typical hours.
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  // Use Intl to compute Warsaw offset at the local moment.
  const local = new Date(Date.UTC(y, mo - 1, d, h, mi));
  // Warsaw offset for this instant
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = dtf.formatToParts(local);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const wY = get("year"), wMo = get("month"), wD = get("day");
  const wH = get("hour") % 24, wMi = get("minute"), wS = get("second");
  const asWarsaw = Date.UTC(wY, wMo - 1, wD, wH, wMi, wS);
  const offsetMs = asWarsaw - local.getTime();
  return new Date(local.getTime() - offsetMs).toISOString();
}

export function QuickCreateBookingPopup({
  open,
  onClose,
  date,
  initialStart,
  initialStaffId,
  maxDurationMin,
  staff,
  services,
  bookingsToday,
  returnTo,
}: Props) {
  // Optionally restrict the selectable services to those that fit a tight gap.
  const availableServices = useMemo(
    () => maxDurationMin
      ? services.filter((s) => s.duration_min <= maxDurationMin)
      : services,
    [services, maxDurationMin],
  );

  const [start, setStart] = useState(initialStart);
  const [serviceId, setServiceId] = useState(availableServices[0]?.id ?? "");
  const [staffId, setStaffId] = useState(initialStaffId);
  const [endOverride, setEndOverride] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSug, setShowSug] = useState(false);
  const sugRef = useRef<HTMLDivElement>(null);

  // Reset fields whenever the popup opens for a new slot.
  useEffect(() => {
    if (!open) return;
    setStart(initialStart);
    setStaffId(initialStaffId);
    setServiceId(availableServices[0]?.id ?? "");
    setEndOverride(null);
    setPhone("");
    setCustomerName("");
    setCustomerEmail("");
    setNotes("");
    setSuggestions([]);
    setShowSug(false);
  }, [open, initialStart, initialStaffId, availableServices]);

  // Phone search
  useEffect(() => {
    if (phone.length < 3) { setSuggestions([]); setShowSug(false); return; }
    const t = setTimeout(async () => {
      const res = await searchCustomersAction(phone);
      setSuggestions(res);
      setShowSug(res.length > 0);
    }, 300);
    return () => clearTimeout(t);
  }, [phone]);

  // Close suggestions on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) setShowSug(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function selectCustomer(c: Customer) {
    setPhone(c.phone);
    setCustomerName(c.name);
    setCustomerEmail(c.email ?? "");
    setShowSug(false);
  }

  const selectedService = useMemo(
    () => availableServices.find((s) => s.id === serviceId) ?? null,
    [availableServices, serviceId]
  );

  // End time = start + service.duration_min unless user manually overrides.
  const computedEnd = useMemo(() => {
    if (endOverride) return endOverride;
    if (!selectedService) return fmtMin(parseHM(start) + 30);
    return fmtMin(parseHM(start) + selectedService.duration_min);
  }, [start, selectedService, endOverride]);

  // Conflict detection — overlap with another booking on the same staff.
  const conflict = useMemo(() => {
    if (!staffId) return null;
    const newStart = parseHM(start);
    const newEnd = parseHM(computedEnd);
    if (newEnd <= newStart) return null;
    const sameStaff = bookingsToday.filter((b) => b.staffId === staffId);
    const newStartUtc = new Date(utcIsoOf(date, start)).getTime();
    const newEndUtc = new Date(utcIsoOf(date, computedEnd)).getTime();
    for (const b of sameStaff) {
      const bs = new Date(b.startsAtIso).getTime();
      const be = new Date(b.endsAtIso).getTime();
      if (newStartUtc < be && newEndUtc > bs) {
        return {
          startsAt: new Date(b.startsAtIso),
          endsAt: new Date(b.endsAtIso),
        };
      }
    }
    return null;
  }, [staffId, start, computedEnd, bookingsToday, date]);

  const [state, action, pending] = useActionState<AdminBookingState, FormData>(
    createAdminBookingAction,
    { status: "idle" }
  );
  const fieldErr = state.status === "error" ? state.fieldErrors ?? {} : {};

  if (!open) return null;

  const formattedDate = (() => {
    const PL = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
    const [y, m, d] = date.split("-").map(Number);
    return `${d} ${PL[m - 1]} ${y}`;
  })();

  return (
    <div
      className="fixed inset-0 z-[400] flex items-start justify-center bg-black/70 px-4 pb-4 pt-[72px]"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        style={{ maxHeight: "calc(100vh - 96px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Nowa rezerwacja</p>
              <h2 className="mt-0.5 text-lg font-semibold text-zinc-100">{formattedDate}</h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-2xl leading-none text-zinc-600 hover:text-zinc-300"
              aria-label="Zamknij"
            >
              ×
            </button>
          </div>
        </div>

        <form action={action} className="overflow-y-auto px-5 py-4 space-y-4 text-sm">
          {/* Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Od</label>
              <input
                type="time"
                value={start}
                onChange={(e) => { setStart(e.target.value); setEndOverride(null); }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Do</label>
              <input
                type="time"
                value={computedEnd}
                onChange={(e) => setEndOverride(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Usługa
              {maxDurationMin && (
                <span className="ml-1 text-emerald-400">· tylko ≤ {maxDurationMin} min</span>
              )}
            </label>
            {availableServices.length === 0 ? (
              <p className="rounded-md border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
                Brak usług, które mieszczą się w {maxDurationMin} min.
              </p>
            ) : (
              <select
                value={serviceId}
                onChange={(e) => { setServiceId(e.target.value); setEndOverride(null); }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                required
              >
                {availableServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.duration_min} min · {s.price_pln} zł
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Staff — read-only. The slot already encodes who was clicked, and
              this panel doesn't know other employees' availability, so an
              actual picker would mislead. */}
          {(() => {
            const s = staff.find((x) => x.id === staffId);
            return (
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Pracownik</label>
                <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1.5 text-sm text-zinc-300">
                  {s ? (
                    <>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span>{s.name}</span>
                    </>
                  ) : (
                    <span className="text-zinc-500">Dowolny</span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Conflict warning */}
          {conflict && (
            <p className="rounded-md border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
              ⚠︎ Konflikt: ten pracownik ma już rezerwację{" "}
              <span className="font-mono">
                {fmtMin(parseHM(new Intl.DateTimeFormat("pl-PL", {
                  timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", hour12: false,
                }).format(conflict.startsAt)))}
                –
                {fmtMin(parseHM(new Intl.DateTimeFormat("pl-PL", {
                  timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", hour12: false,
                }).format(conflict.endsAt)))}
              </span>
              . Rezerwacja zostanie odrzucona przez backend.
            </p>
          )}

          {/* Customer */}
          <div className="relative" ref={sugRef}>
            <label className="mb-1 block text-xs text-zinc-500">Telefon klienta *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="np. +48 600 100 200"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              autoComplete="off"
            />
            {fieldErr.customerPhone && <p className="mt-1 text-xs text-red-400">{fieldErr.customerPhone}</p>}
            {showSug && (
              <div className="absolute z-30 mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-zinc-800"
                  >
                    <span className="text-zinc-100">{c.name}</span>
                    <span className="font-mono text-zinc-500">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Imię i nazwisko *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
              {fieldErr.customerName && <p className="mt-1 text-xs text-red-400">{fieldErr.customerName}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Uwagi</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>

          {/* Hidden fields for the action */}
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="startsAtIso" value={utcIsoOf(date, start)} />
          <input type="hidden" name="customerName" value={customerName} />
          <input type="hidden" name="customerPhone" value={phone} />
          <input type="hidden" name="customerEmail" value={customerEmail} />
          <input type="hidden" name="staffId" value={staffId} />
          <input type="hidden" name="notes" value={notes} />
          <input type="hidden" name="returnTo" value={returnTo} />

          {state.status === "error" && !Object.keys(fieldErr).length && (
            <p className="rounded-md border border-red-900/50 bg-red-950/30 p-2.5 text-xs text-red-300">
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={pending || !phone || !customerName || availableServices.length === 0}
              className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {pending ? "Rezerwuję…" : "Dodaj rezerwację"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
