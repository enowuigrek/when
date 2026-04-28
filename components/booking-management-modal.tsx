"use client";

import { useState, useTransition, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  cancelBookingAction,
  assignStaffAction,
  markNoShowAction,
  editBookingNotesAction,
  rescheduleBookingAction,
  changeBookingServiceAction,
} from "@/app/admin/(panel)/actions";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

type Staff = { id: string; name: string; color: string };
export type ServiceOption = { id: string; name: string; duration_min: number; price_pln: number };

export type BookingForModal = {
  id: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone: string;
  serviceId: string | null;
  serviceName: string | null;
  staffId: string | null;
  staffName: string | null;
  staffColor: string | null;
  notes: string | null;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
};

type Tab = "info" | "reschedule" | "service" | "reassign" | "cancel";

function warsawDateStr(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
}

export function BookingManagementButton({
  booking,
  allStaff,
  allServices = [],
  className,
  children,
}: {
  booking: BookingForModal;
  allStaff: Staff[];
  allServices?: ServiceOption[];
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <BookingModal booking={booking} allStaff={allStaff} allServices={allServices} onClose={() => setOpen(false)} />}
    </>
  );
}

function BookingModal({
  booking,
  allStaff,
  allServices,
  onClose,
}: {
  booking: BookingForModal;
  allStaff: Staff[];
  allServices: ServiceOption[];
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
  const [serviceSel, setServiceSel] = useState(booking.serviceId ?? "");

  useEffect(() => {
    function h(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
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
      else { refresh(); onClose(); }
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
      else { refresh(); onClose(); }
    });
  }

  async function handleChangeService() {
    setError(null);
    if (!serviceSel || serviceSel === booking.serviceId) return;
    const fd = new FormData();
    fd.set("id", booking.id);
    fd.set("serviceId", serviceSel);
    start(async () => {
      const res = await changeBookingServiceAction(fd);
      if (!res.ok) setError(res.message);
      else { refresh(); onClose(); }
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
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd");
      }
    });
  }

  const isCancelled = booking.status === "cancelled";
  const isPast = new Date(booking.startsAt).getTime() < Date.now();

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
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
              ["service", "Usługa"],
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
        <div className="px-5 py-4 text-sm">
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

          {!isCancelled && tab === "service" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">Zmień usługę. Czas trwania zostanie dopasowany — jeśli nowa usługa jest dłuższa i koliduje z inną rezerwacją, zobaczysz błąd.</p>
              <select
                value={serviceSel}
                onChange={(e) => setServiceSel(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                {allServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.duration_min} min · {s.price_pln} zł
                  </option>
                ))}
              </select>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleChangeService}
                  disabled={pending || !serviceSel || serviceSel === booking.serviceId}
                  className="rounded-full bg-[var(--color-accent)] px-4 py-1 text-xs font-medium text-zinc-950 disabled:opacity-50"
                >
                  {pending ? "…" : "Zmień usługę"}
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
                  className="rounded-full bg-red-700 px-4 py-1 text-xs font-medium text-zinc-100 hover:bg-red-600 disabled:opacity-50"
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
