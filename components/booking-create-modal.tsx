"use client";

import { useState, useTransition, useEffect, useRef, type ReactNode } from "react";
import { fieldClasses } from "@/components/ui/field";
import { useRouter } from "next/navigation";
import { createBookingAtSlotAction } from "@/app/admin/(panel)/actions";
import { searchCustomersAction } from "@/app/admin/(panel)/rezerwacja/nowa/actions";
import { formatWarsawDate } from "@/lib/slots";

type Staff = { id: string; name: string; color: string };
export type ServiceOption = { id: string; name: string; duration_min: number; price_pln: number };
type CustomerHit = { id: string; name: string; phone: string; email: string | null };

const inputCls = fieldClasses();
const labelCls = "block text-xs uppercase tracking-wider text-zinc-500";

/**
 * Opens the booking modal in create mode from an empty slot in the schedule.
 *
 * Clicking an empty cell already says who and when, so those arrive prefilled
 * and only the service and the customer are left to choose. Deliberately the
 * same shell as the management modal — from the admin's side it is the same
 * window, just before the booking exists rather than after.
 */
export function NewBookingButton({
  services,
  allStaff,
  date,
  time,
  presetStaffId,
  className,
  children,
}: {
  services: ServiceOption[];
  allStaff: Staff[];
  /** Warsaw date of the clicked cell, YYYY-MM-DD. */
  date: string;
  /** Warsaw time of the clicked cell, HH:MM. */
  time: string;
  presetStaffId: string | null;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && (
        <NewBookingModal
          services={services}
          allStaff={allStaff}
          date={date}
          time={time}
          presetStaffId={presetStaffId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function NewBookingModal({
  services,
  allStaff,
  date,
  time,
  presetStaffId,
  onClose,
}: {
  services: ServiceOption[];
  allStaff: Staff[];
  date: string;
  time: string;
  presetStaffId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(presetStaffId ?? "");
  const [timeVal, setTimeVal] = useState(time);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [picked, setPicked] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    function h(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", h);

    // Freeze the page behind the dialog. Without this a swipe inside the
    // modal scrolled the schedule underneath it, which on a phone reads as
    // the form refusing to move.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Look up the customer book while the phone is typed. Picking a hit fills
  // the rest; typing a number that isn't there is fine — the booking creates
  // the customer.
  useEffect(() => {
    if (picked || phone.trim().length < 3) { setHits([]); return; }
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      try {
        const res = await searchCustomersAction(phone.trim());
        // Drop results from a query the user has already typed past.
        if (seq === searchSeq.current) setHits(res as CustomerHit[]);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [phone, picked]);

  const service = services.find((s) => s.id === serviceId);

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.set("serviceId", serviceId);
    fd.set("date", date);
    fd.set("time", timeVal);
    if (staffId) fd.set("staffId", staffId);
    fd.set("customerName", name);
    fd.set("customerPhone", phone);
    if (email) fd.set("customerEmail", email);
    if (notes) fd.set("notes", notes);

    start(async () => {
      const res = await createBookingAtSlotAction(fd);
      if (!res.ok) setError(res.message);
      else { router.refresh(); onClose(); }
    });
  }

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
        // maxHeight inline, not an arbitrary Tailwind class — those are not
        // reliably generated in this project.
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — mirrors the management modal */}
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Nowa rezerwacja</p>
              <h2 className="mt-0.5 truncate text-lg font-semibold text-zinc-100">
                {formatWarsawDate(`${date}T12:00:00Z`)}
              </h2>
            </div>
            <button onClick={onClose} className="shrink-0 text-2xl leading-none text-zinc-600 hover:text-zinc-300">×</button>
          </div>
          {service && (
            <p className="mt-3 font-mono text-sm text-zinc-300">
              {timeVal} · {service.duration_min} min · {service.price_pln} zł
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {error && (
            <p className="rounded-md border border-red-900/50 bg-red-900/20 px-3 py-2 text-xs text-red-300">{error}</p>
          )}

          <div>
            <label className={labelCls}>Usługa</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={`mt-1.5 ${inputCls}`}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.duration_min} min, {s.price_pln} zł</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className={labelCls}>Telefon klienta</label>
            <input
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPicked(false); }}
              placeholder="+48 600 000 000"
              className={`mt-1.5 ${inputCls}`}
            />
            {hits.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
                {hits.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setName(c.name); setPhone(c.phone); setEmail(c.email ?? "");
                        setPicked(true); setHits([]);
                      }}
                      className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
                    >
                      <span className="text-sm text-zinc-200">{c.name}</span>
                      <span className="ml-2 font-mono text-xs text-zinc-500">{c.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className={labelCls}>Imię i nazwisko</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" className={`mt-1.5 ${inputCls}`} />
          </div>

          {/* min-w-0 on both cells: grid items default to min-width:auto, so the
              time input kept its intrinsic width and slid under the staff
              select on a narrow phone. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className={labelCls}>Godzina</label>
              <input type="time" value={timeVal} onChange={(e) => setTimeVal(e.target.value)} className={`mt-1.5 ${inputCls} font-mono`} />
            </div>
            <div className="min-w-0">
              <label className={labelCls}>Pracownik</label>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={`mt-1.5 ${inputCls}`}>
                <option value="">— dowolny —</option>
                {allStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notatka</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Opcjonalnie…"
              className={`mt-1.5 ${inputCls}`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500">
            Anuluj
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !serviceId}
            className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {pending ? "Zapisuję…" : "Dodaj rezerwację"}
          </button>
        </div>
      </div>
    </div>
  );
}
