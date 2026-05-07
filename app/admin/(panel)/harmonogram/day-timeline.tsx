"use client";

import { useState, type MouseEvent } from "react";
import { BookingManagementButton, type BookingForModal, type ServiceOption } from "@/components/booking-management-modal";
import { formatWarsawTime } from "@/lib/slots";
import type { BookingWithService } from "@/lib/db/bookings";
import { QuickCreateBookingPopup } from "./quick-create-popup";

const ROW_PX = 48;
const SLOT_MIN = 30;

type Staff = { id: string; name: string; color: string };

type Props = {
  /** YYYY-MM-DD — the viewed day. */
  date: string;
  bookings: BookingWithService[];
  visibleStaff: Staff[];
  allStaff: Staff[];
  allServices: ServiceOption[];
  /** "HH:MM" 24h business hours for THIS day. */
  businessOpen: string | null;
  businessClose: string | null;
  closed: boolean;
  /** "/admin/harmonogram?od=…&pracownik=…" so the create-action returns here. */
  returnTo: string;
};

function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Warsaw local minutes since midnight, derived from a UTC instant. */
function warsawMinutesOf(iso: string): number {
  return parseHM(formatWarsawTime(iso));
}

function toModalBooking(b: BookingWithService): BookingForModal {
  return {
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    serviceId: b.service_id,
    serviceName: b.service?.name ?? null,
    staffId: b.staff_id,
    staffName: b.staff?.name ?? null,
    staffColor: b.staff?.color ?? null,
    notes: b.notes,
    status: b.status,
    paymentStatus: b.payment_status ?? null,
  };
}

/**
 * Day-view timetable. Time runs vertically (30-min rows). Each staff member is
 * one column; bookings are absolute-positioned with top + height derived from
 * start time and duration.
 *
 * Empty cells are clickable: click opens a quick-create-booking popup with
 * the slot's start time and the column's staff pre-filled.
 */
export function DayTimeline({
  date,
  bookings,
  visibleStaff,
  allStaff,
  allServices,
  businessOpen,
  businessClose,
  closed,
  returnTo,
}: Props) {
  // Time range — start with business hours, expand outwards if any booking
  // sits outside them so it's never clipped.
  const bizOpen = businessOpen ? parseHM(businessOpen) : 9 * 60;
  const bizClose = businessClose ? parseHM(businessClose) : 20 * 60;
  let firstMin = bizOpen;
  let lastMin = bizClose;
  for (const b of bookings) {
    const s = warsawMinutesOf(b.starts_at);
    const e = warsawMinutesOf(b.ends_at);
    if (s < firstMin) firstMin = s;
    if (e > lastMin) lastMin = e;
  }
  firstMin = Math.floor(firstMin / SLOT_MIN) * SLOT_MIN;
  lastMin = Math.ceil(lastMin / SLOT_MIN) * SLOT_MIN;
  const totalMin = Math.max(SLOT_MIN, lastMin - firstMin);
  const rowCount = totalMin / SLOT_MIN;
  const gridHeight = rowCount * ROW_PX;

  // Group bookings by staff.
  const byStaff = new Map<string, BookingWithService[]>();
  const unassigned: BookingWithService[] = [];
  for (const b of bookings) {
    if (!b.staff_id) {
      unassigned.push(b);
      continue;
    }
    if (!byStaff.has(b.staff_id)) byStaff.set(b.staff_id, []);
    byStaff.get(b.staff_id)!.push(b);
  }
  const showUnassigned = visibleStaff.length > 0 && unassigned.length > 0;

  type Column = { id: string; name: string; color: string; bookings: BookingWithService[]; isSpecial?: boolean };
  const columns: Column[] =
    visibleStaff.length === 0
      ? [{ id: "__all__", name: "Rezerwacje", color: "#71717a", bookings, isSpecial: true }]
      : [
          ...visibleStaff.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color,
            bookings: byStaff.get(s.id) ?? [],
          })),
          ...(showUnassigned
            ? [{ id: "__none__", name: "Nieprzypisane", color: "#71717a", bookings: unassigned, isSpecial: true }]
            : []),
        ];

  // ── Quick-create popup ───────────────────────────────────────────────────
  const [popup, setPopup] = useState<{ open: boolean; start: string; staffId: string }>({
    open: false, start: "09:00", staffId: "",
  });
  function openSlotAt(e: MouseEvent<HTMLButtonElement>, columnId: string) {
    if (columnId === "__all__" || columnId === "__none__") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slotIdx = Math.max(0, Math.min(rowCount - 1, Math.floor(y / ROW_PX)));
    const slotMin = firstMin + slotIdx * SLOT_MIN;
    setPopup({ open: true, start: fmtMin(slotMin), staffId: columnId });
  }

  const conflictBookings = bookings.map((b) => ({
    id: b.id,
    staffId: b.staff_id,
    startsAtIso: b.starts_at,
    endsAtIso: b.ends_at,
  }));

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/60">
      {closed && (
        <div className="border-b border-zinc-800/60 bg-zinc-900/40 px-4 py-2 text-xs text-zinc-500">
          Dzień zamknięty wg godzin biznesu — pokazane tylko ewentualne rezerwacje.
        </div>
      )}

      <div
        className="grid"
        style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(140px, 1fr))` }}
      >
        {/* Header row */}
        <div className="border-b border-r border-zinc-800/60 bg-zinc-900/60 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
          Godz.
        </div>
        {columns.map((c) => (
          <div
            key={`h-${c.id}`}
            className="flex items-center gap-1.5 border-b border-r border-zinc-800/60 bg-zinc-900/60 px-3 py-2.5 text-xs font-medium uppercase tracking-wider last:border-r-0"
            style={{ color: c.isSpecial ? undefined : c.color }}
          >
            {!c.isSpecial && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
            )}
            <span className={c.isSpecial ? "text-zinc-500" : ""}>{c.name}</span>
          </div>
        ))}

        {/* Time labels column */}
        <div className="relative border-r border-zinc-800/60" style={{ height: gridHeight }}>
          {Array.from({ length: rowCount }, (_, i) => (
            <div
              key={i}
              className="absolute inset-x-0 px-3 pt-1 font-mono text-[11px] text-zinc-600"
              style={{ top: i * ROW_PX, height: ROW_PX }}
            >
              {fmtMin(firstMin + i * SLOT_MIN)}
            </div>
          ))}
        </div>

        {/* Staff columns */}
        {columns.map((c) => (
          <div
            key={`c-${c.id}`}
            className="relative border-r border-zinc-800/60 last:border-r-0"
            style={{ height: gridHeight }}
          >
            {/* Subtle dashed grid lines on every 30-min boundary */}
            {Array.from({ length: rowCount }, (_, i) => (
              <div
                key={`bg-${i}`}
                className="pointer-events-none absolute inset-x-0"
                style={{
                  top: i * ROW_PX,
                  height: ROW_PX,
                  borderTop: i === 0 ? undefined : "1px dashed rgba(63, 63, 70, 0.35)",
                }}
              />
            ))}

            {/* Click overlay — empty area triggers quick-create. Bookings sit
                above this in z-index and intercept their own clicks. */}
            {!c.isSpecial && (
              <button
                type="button"
                aria-label="Dodaj rezerwację"
                onClick={(e) => openSlotAt(e, c.id)}
                className="absolute inset-0 z-0 cursor-cell hover:bg-zinc-800/30 focus:bg-zinc-800/30"
              />
            )}

            {/* Bookings — absolute-positioned wrappers around the modal button */}
            {c.bookings.map((b) => {
              const s = warsawMinutesOf(b.starts_at);
              const e = warsawMinutesOf(b.ends_at);
              const top = ((s - firstMin) / SLOT_MIN) * ROW_PX;
              const rawHeight = ((e - s) / SLOT_MIN) * ROW_PX;
              const height = Math.max(20, rawHeight);
              const cardColor = b.staff?.color ?? "#71717a";
              return (
                <div
                  key={b.id}
                  className="absolute left-1 right-1 z-10"
                  style={{ top, height }}
                >
                  <BookingManagementButton
                    booking={toModalBooking(b)}
                    allStaff={allStaff}
                    allServices={allServices}
                    className="block h-full w-full overflow-hidden rounded-md text-left transition-opacity hover:opacity-80"
                  >
                    <div
                      className="flex h-full flex-col overflow-hidden px-2 py-1"
                      style={{
                        backgroundColor: `${cardColor}26`,
                        borderLeft: `2px solid ${cardColor}`,
                      }}
                    >
                      <p className="font-mono text-[10px] leading-tight text-zinc-300">
                        {formatWarsawTime(b.starts_at)}
                        {height >= 32 && (
                          <span className="text-zinc-600">–{formatWarsawTime(b.ends_at)}</span>
                        )}
                      </p>
                      <p className="truncate text-xs font-medium leading-tight text-zinc-100">
                        {b.customer_name}
                      </p>
                      {b.service && (
                        <p className="truncate text-[10px] leading-tight text-zinc-400">
                          {b.service.name}
                        </p>
                      )}
                    </div>
                  </BookingManagementButton>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <QuickCreateBookingPopup
        open={popup.open}
        onClose={() => setPopup((p) => ({ ...p, open: false }))}
        date={date}
        initialStart={popup.start}
        initialStaffId={popup.staffId}
        staff={visibleStaff.length === 0 ? allStaff : visibleStaff}
        services={allServices}
        bookingsToday={conflictBookings}
        returnTo={returnTo}
      />
    </div>
  );
}
