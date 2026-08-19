"use client";

import { useState, useTransition, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  cancelBookingAction,
  assignStaffAction,
  markNoShowAction,
  editBookingNotesAction,
  rescheduleBookingAction,
} from "@/app/admin/(panel)/actions";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

type Staff = { id: string; name: string; color: string };

export type BookingForModal = {
  id: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone: string;
  serviceName: string | null;
  staffId: string | null;
  staffName: string | null;
  staffColor: string | null;
  notes: string | null;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
};

type Tab = "info" | "reschedule" | "reassign" | "cancel";

/**
 * What the modal did, reported back to whoever opened it.
 *
 * A list that opened this modal cannot see the result otherwise: the server
 * data behind it was fetched before the change, and a router.refresh() does
 * not reach state the caller is holding — such as the conflicts left by a new
 * absence. Handing the outcome back lets that list say what happened to each
 * row instead of looking untouched.
 */
export type BookingOutcome =
  | { kind: "reschedule"; date: string; time: string }
  | { kind: "reassign"; staffName: string }
  | { kind: "cancel" }
  | { kind: "no_show" };

function warsawDateStr(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
}

export function BookingManagementButton({
  booking,
  allStaff,
  className,
  onResolved,
  openOnMount = false,
  children,
}: {
  booking: BookingForModal;
  allStaff: Staff[];
  className?: string;
  /** Called with what was done, before the modal closes. */
  onResolved?: (outcome: BookingOutcome) => void;
  /**
   * Open straight away. Set by the schedule for the booking named in
   * `?rezerwacja=`, so a notification lands on the booking itself rather than
   * somewhere on its day.
   */
  openOnMount?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(openOnMount);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && (
        <BookingModal
          booking={booking}
          allStaff={allStaff}
          onResolved={onResolved}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function BookingModal({
  booking,
  allStaff,
  onResolved,
  onClose,
}: {
  booking: BookingForModal;
  allStaff: Staff[];
  onResolved?: (outcome: BookingOutcome) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("info");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [staffSel, setStaffSel] = useState(booking.staffId ?? "");
  const [date, setDate] = useState(warsawDateStr(booking.startsAt));
  const [time, setTime] = useState(formatWarsawTime(booking.startsAt));
  const [reason, setReason] = useState("");

  useEffect(() => {
    function h(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", h);

    // Freeze the page behind the dialog — see booking-create-modal.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  function refresh() {
    router.refresh();
  }

  async function handleSaveNotes() {
    setError(null);
    const fd = new FormData();
    fd.set("id", booking.id);
    fd.set("notes", notes);
    start(async () => {
      const res = await editBookingNotesAction(fd);
      if (!res.ok) setError(res.message);
      else refresh();
    });
  }

  async function handleReassign() {
    setError(null);
    const fd = new FormData();
    fd.set("id", booking.id);
    fd.set("staffId", staffSel);
    start(async () => {
      const res = await assignStaffAction(fd);
      if (!res.ok) setError(res.message);
      else {
        refresh();
        onResolved?.({
          kind: "reassign",
          staffName: allStaff.find((s) => s.id === staffSel)?.name ?? "—",
        });
        onClose();
      }
    });
  }

  async function handleReschedule() {
    setError(null);
    const fd = new FormData();
    fd.set("id", booking.id);
    fd.set("date", date);
    fd.set("time", time);
    start(async () => {
      const res = await rescheduleBookingAction(fd);
      if (!res.ok) setError(res.message);
      else {
        refresh();
        onResolved?.({ kind: "reschedule", date, time });
        onClose();
      }
    });
  }

  async function handleCancel() {
    setError(null);
    const fd = new FormData();
    fd.set("id", booking.id);
    if (reason) fd.set("reason", reason);
    start(async () => {
      try {
        await cancelBookingAction(fd);
        refresh();
        onResolved?.({ kind: "cancel" });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd anulowania");
      }
    });
  }

  async function handleNoShow() {
    setError(null);
    const fd = new FormData();
    fd.set("id", booking.id);
    start(async () => {
      try {
        await markNoShowAction(fd);
        refresh();
        onResolved?.({ kind: "no_show" });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd");
      }
    });
  }

  const isCancelled = booking.status === "cancelled";
  const isPast = new Date(booking.startsAt).getTime() < Date.now();

  return (
    <div
      // Anchored to the top, not centred. A centred dialog moves its own header
      // and buttons whenever the body changes height — switching tabs, or the
      // customer suggestions opening — so parts that did not change appear to
      // drift. Pinned at the top it can only grow downwards.
      className="fixed inset-0 z-[400] flex items-start justify-center bg-black/70 px-4"
      style={{ paddingTop: "10vh", paddingBottom: "4vh" }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Rezerwacja</p>
              <h2 className="mt-0.5 truncate text-lg font-semibold text-zinc-100">{booking.customerName}</h2>
              <p className="mt-0.5 font-mono text-xs text-zinc-500">{booking.customerPhone}</p>
            </div>
            <button onClick={onClose} className="shrink-0 text-2xl leading-none text-zinc-600 hover:text-zinc-300">×</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-mono text-zinc-300">{formatWarsawDate(booking.startsAt)} · {formatWarsawTime(booking.startsAt)}–{formatWarsawTime(booking.endsAt)}</span>
            {booking.serviceName && <span className="text-zinc-500">· {booking.serviceName}</span>}
          </div>
          {booking.staffName && (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: booking.staffColor ?? "#888" }} />
              <span className="text-xs text-zinc-500">{booking.staffName}</span>
            </div>
          )}
          {isCancelled && (
            <p className="mt-2 inline-block rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-400">Anulowana</p>
          )}
        </div>

        {/* Tabs */}
        {!isCancelled && (
          <div className="flex gap-0.5 border-b border-zinc-800 bg-zinc-900/40 px-2 py-1.5 text-xs">
            {([
              ["info", "Notatki"],
              ["reschedule", "Przełóż"],
              ["reassign", "Pracownik"],
              ["cancel", "Anuluj"],
            ] as [Tab, string][]).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => { setTab(k); setError(null); }}
                className={`flex-1 rounded px-2 py-1.5 transition-colors ${
                  tab === k ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm">
          {error && <p className="mb-3 rounded-md border border-red-900/50 bg-red-900/20 px-3 py-2 text-xs text-red-300">{error}</p>}

          {(isCancelled || tab === "info") && (
            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-wider text-zinc-500">Notatki</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={isCancelled}
                placeholder="Dodaj uwagi do rezerwacji…"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-60"
              />
              {!isCancelled && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {isPast && (
                    <button
                      type="button"
                      onClick={handleNoShow}
                      disabled={pending}
                      className="rounded-full border border-amber-900/50 px-3 py-1 text-xs text-amber-400 hover:bg-amber-900/20 disabled:opacity-50"
                    >
                      Nie przyszedł
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={pending}
                    className="ml-auto rounded-full bg-[var(--color-accent)] px-4 py-1 text-xs font-medium text-zinc-950 disabled:opacity-50"
                  >
                    {pending ? "…" : "Zapisz notatkę"}
                  </button>
                </div>
              )}
            </div>
          )}

          {!isCancelled && tab === "reschedule" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">Wybierz nowy termin. Czas trwania pozostaje bez zmian.</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-zinc-500">Data</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-zinc-500">Godzina</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleReschedule}
                  disabled={pending}
                  className="rounded-full bg-[var(--color-accent)] px-4 py-1 text-xs font-medium text-zinc-950 disabled:opacity-50"
                >
                  {pending ? "…" : "Przełóż"}
                </button>
              </div>
            </div>
          )}

          {!isCancelled && tab === "reassign" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">Przepisz rezerwację na innego pracownika.</p>
              <select
                value={staffSel}
                onChange={(e) => setStaffSel(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                <option value="">— bez pracownika —</option>
                {allStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleReassign}
                  disabled={pending || staffSel === (booking.staffId ?? "")}
                  className="rounded-full bg-[var(--color-accent)] px-4 py-1 text-xs font-medium text-zinc-950 disabled:opacity-50"
                >
                  {pending ? "…" : "Przepisz"}
                </button>
              </div>
            </div>
          )}

          {!isCancelled && tab === "cancel" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">Anulowanie wyśle e-mail do klienta (jeśli ma adres).</p>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Powód (opcjonalnie)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="np. choroba pracownika"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={pending}
                  className="on-solid rounded-full bg-red-700 px-4 py-1 text-xs font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {pending ? "…" : "Anuluj rezerwację"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
