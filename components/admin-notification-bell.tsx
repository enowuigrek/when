"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { useAdminBase } from "@/lib/use-admin-base";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

type EventType = "created" | "rescheduled" | "cancelled";
type EventSource = "customer" | "admin";

type RawEvent = {
  id: string;
  booking_id: string | null;
  event_type: EventType;
  source: EventSource;
  customer_name: string;
  service_name: string | null;
  starts_at: string;
  created_at: string;
};

type NotifItem = {
  id: string;
  /** Which booking to open when the row is clicked. */
  bookingId: string | null;
  eventType: EventType;
  source: EventSource;
  customerName: string;
  serviceName: string | null;
  startsAt: string;
  createdAt: string;
  read: boolean;
};

type Toast = NotifItem;

// Short enough that a booking shows up while someone is watching the panel on
// a second screen (where no focus event fires). Payload is a cursor-scoped
// delta, usually empty, so the extra ticks are cheap.
const POLL_MS = 10_000;

function notifsKey(tenantId: string) { return `when_admin_notifs_v4_${tenantId}`; }
function cursorKey(tenantId: string) { return `when_admin_cursor_v1_${tenantId}`; }

function loadStored(tenantId: string): NotifItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(notifsKey(tenantId)) ?? "[]"); }
  catch { return []; }
}
function saveStored(items: NotifItem[], tenantId: string) {
  localStorage.setItem(notifsKey(tenantId), JSON.stringify(items.slice(0, 50)));
}
function loadCursor(tenantId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(cursorKey(tenantId));
}
function saveCursor(iso: string, tenantId: string) {
  localStorage.setItem(cursorKey(tenantId), iso);
}
function warsawDateStr(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
}

const TITLE: Record<EventType, string> = {
  created: "Nowa rezerwacja",
  rescheduled: "Zmiana terminu",
  cancelled: "Anulowana rezerwacja",
};
const ACCENT: Record<EventType, string> = {
  created: "text-emerald-400",
  rescheduled: "text-blue-400",
  cancelled: "text-red-400",
};

/**
 * A tinted chip per event type, in place of the emoji this used to print.
 *
 * Emoji render as whatever the operating system decides — a flat green disc on
 * one machine, a glossy one on another — so three of them in a column read as
 * clip-art rather than as part of the panel. These follow the same colours the
 * titles already use.
 */
function EventIcon({ type }: { type: EventType }) {
  const tint: Record<EventType, string> = {
    created: "bg-emerald-500/15 text-emerald-400",
    rescheduled: "bg-blue-500/15 text-blue-400",
    cancelled: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tint[type]}`}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {type === "created" && <><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M12 14v4M10 16h4" /></>}
        {type === "rescheduled" && <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></>}
        {type === "cancelled" && <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></>}
      </svg>
    </span>
  );
}

// ── Bell SVG ──────────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}


/**
 * One notification. Both panel shapes render this, rather than each keeping
 * its own copy of the markup — they had already drifted apart on the size of
 * the delete button.
 */
function NotifRow({
  item,
  onOpen,
  onDelete,
}: {
  item: NotifItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`relative flex items-start gap-3 px-4 py-3 transition-colors ${item.read ? "" : "bg-zinc-800/30"}`}>
      {/* Unread reads as a bar down the edge of the row rather than a dot in
          the text flow — it marks the whole row and costs no indent, so read
          and unread rows line up with each other. */}
      {!item.read && (
        <span className="absolute inset-y-0 left-0 w-0.5 bg-[var(--color-accent)]" aria-hidden="true" />
      )}
      <EventIcon type={item.eventType} />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className={`text-sm font-medium ${ACCENT[item.eventType]}`}>{TITLE[item.eventType]}</p>
        <p className={`truncate text-sm ${item.read ? "text-zinc-400" : "text-zinc-100"}`}>{item.customerName}</p>
        {item.serviceName && <p className="truncate text-xs text-zinc-500">{item.serviceName}</p>}
        <p className="text-xs text-zinc-500">{formatWarsawDate(item.startsAt)}, {formatWarsawTime(item.startsAt)}</p>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="ml-1 shrink-0 text-lg leading-none text-zinc-600 hover:text-zinc-300"
        aria-label={`Usuń powiadomienie — ${item.customerName}`}
      >
        ×
      </button>
    </li>
  );
}

// ── Component ─────────────────────────────────────────────────────────────
//
// panelLeft  – when provided, render a fixed side panel at that x offset
//              instead of a dropdown. Pass sidebar width (60 or 220).
// navMode    – render trigger as a full-width nav-link-style row
// sidebarExpanded – controls whether the label text is visible in navMode

export function AdminNotificationBell({
  tenantId,
  panelLeft,
  navMode = false,
  sidebarExpanded = false,
}: {
  tenantId: string;
  panelLeft?: number;
  navMode?: boolean;
  sidebarExpanded?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const adminBase = useAdminBase();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [open, setOpen] = useState(false);
  const initialLoad = useRef(true);
  const cursorRef = useRef<string | null>(null);

  // In a demo/trial panel the request must carry the slug: this fetch doesn't
  // go through the /demo rewrite, so the server has no other way to tell which
  // tenant we are and would default to the real one.
  const demoSlug = pathname.match(/^\/demo\/([^/]+)/)?.[1] ?? null;

  const unread = items.filter((i) => !i.read).length;

  const poll = useCallback(async () => {
    try {
      const since = cursorRef.current;
      const params = new URLSearchParams();
      if (since) params.set("since", since);
      if (demoSlug) params.set("demo", demoSlug);
      const qs = params.toString();
      const res = await fetch(`/api/admin/notifications${qs ? `?${qs}` : ""}`);
      if (!res.ok) return;
      const { events } = await res.json() as { events: RawEvent[] };
      if (events.length === 0) { initialLoad.current = false; return; }

      const latestCreatedAt = events.reduce(
        (max, e) => (e.created_at > max ? e.created_at : max),
        cursorRef.current ?? ""
      );
      cursorRef.current = latestCreatedAt;
      saveCursor(latestCreatedAt, tenantId);

      setItems((prev) => {
        const seenIds = new Set(prev.map((i) => i.id));
        const newItems: NotifItem[] = [];
        const newToasts: Toast[] = [];

        for (const e of events) {
          if (seenIds.has(e.id)) continue;
          const item: NotifItem = {
            id: e.id,
            bookingId: e.booking_id,
            eventType: e.event_type,
            source: e.source,
            customerName: e.customer_name,
            serviceName: e.service_name,
            startsAt: e.starts_at,
            createdAt: e.created_at,
            read: initialLoad.current,
          };
          newItems.push(item);
          if (!initialLoad.current && e.source === "customer") newToasts.push(item);
        }

        initialLoad.current = false;
        if (newItems.length === 0) return prev;

        const merged = [...newItems, ...prev].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveStored(merged, tenantId);
        if (newToasts.length > 0) setToasts((t) => [...t, ...newToasts]);
        return merged;
      });
    } catch { /* network error */ }
  }, [tenantId, demoSlug]);

  useEffect(() => {
    cursorRef.current = loadCursor(tenantId);
    setItems(loadStored(tenantId));
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [poll, tenantId]);

  // Refetch the moment the panel is looked at again. The common flow is
  // booking on the phone (or another tab) and switching straight back — the
  // 30 s tick would leave the panel looking empty exactly then.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") poll();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", poll);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", poll);
    };
  }, [poll]);

  // Auto-dismiss toasts after 5 s
  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts((prev) => prev.slice(1)), 5000);
    return () => clearTimeout(t);
  }, [toasts]);

  // Opening the bell no longer marks everything read. It did, which meant the
  // unread state existed for exactly as long as it took to look at it — you
  // could never open the panel, get interrupted, and come back to find what
  // was new. Reading is now something a row does when you act on it, or the
  // "Przeczytane" button does deliberately.
  function openPanel() {
    setOpen((v) => !v);
  }

  function markRead(id: string) {
    setItems((prev) => {
      const updated = prev.map((i) => (i.id === id ? { ...i, read: true } : i));
      saveStored(updated, tenantId);
      return updated;
    });
  }

  function markAllRead() {
    setItems((prev) => {
      const updated = prev.map((i) => ({ ...i, read: true }));
      saveStored(updated, tenantId);
      return updated;
    });
  }

  function deleteNotif(id: string) {
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      saveStored(updated, tenantId);
      return updated;
    });
  }

  function clearAll() {
    const now = new Date().toISOString();
    cursorRef.current = now;
    saveCursor(now, tenantId);
    setItems([]);
    saveStored([], tenantId);
  }

  /**
   * Open the booking the notification is about.
   *
   * The path was hardcoded to /admin/…, which in a demo panel walked straight
   * out of the /demo/{slug} prefix. The proxy only sets x-demo-slug on paths
   * under /demo, so the schedule that loaded belonged to whatever tenant the
   * admin session pointed at — someone else's diary, reached by clicking a
   * notification about your own booking.
   *
   * `rezerwacja` carries the booking id so the schedule opens that booking
   * rather than just landing on its day.
   */
  function openNotif(item: NotifItem) {
    markRead(item.id);
    setOpen(false);
    const params = new URLSearchParams({ widok: "dzien", od: warsawDateStr(item.startsAt) });
    if (item.bookingId) params.set("rezerwacja", item.bookingId);
    router.push(`${adminBase}/harmonogram?${params.toString()}`);
  }

  // ── Toast portal (always rendered into body) ──────────────────────────
  const toastStack = toasts.length > 0
    ? createPortal(
        <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700/60 bg-zinc-900 px-4 py-3 shadow-xl"
              onClick={() => { setToasts((p) => p.filter((x) => x.id !== t.id)); openNotif(t); }}
            >
              <EventIcon type={t.eventType} />
              <div>
                <p className={`text-sm font-medium ${ACCENT[t.eventType]}`}>{TITLE[t.eventType]}</p>
                <p className="text-xs text-zinc-300">{t.customerName}{t.serviceName ? ` · ${t.serviceName}` : ""}</p>
                <p className="text-xs text-zinc-500">{formatWarsawDate(t.startsAt)}, {formatWarsawTime(t.startsAt)}</p>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )
    : null;

  // ── Trigger button ────────────────────────────────────────────────────
  const trigger = navMode ? (
    // Full-width nav-row style (used inside sidebar)
    <button
      type="button"
      onClick={openPanel}
      className={`flex h-10 w-full items-center rounded-lg px-3 text-sm font-medium transition-colors ${
        open ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      }`}
    >
      <span className="relative shrink-0">
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-[var(--color-accent)] px-0.5 text-[9px] font-bold text-zinc-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      <span
        className={`ml-3 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ${
          sidebarExpanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        Powiadomienia
      </span>
    </button>
  ) : (
    // Standalone icon button (legacy / mobile top bar)
    <button
      type="button"
      onClick={openPanel}
      className="relative flex h-11 w-11 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      aria-label="Powiadomienia"
    >
      <BellIcon />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--color-accent)] px-0.5 text-[10px] font-bold text-zinc-950">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );

  // ── Panel content (shared between side-panel and dropdown) ────────────
  const panelContent = (
    <>
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-200">Powiadomienia</span>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button type="button" onClick={markAllRead} className="text-xs text-zinc-500 hover:text-zinc-300">
              Przeczytane
            </button>
          )}
          {items.length > 0 && (
            <button type="button" onClick={clearAll} className="text-xs text-zinc-500 hover:text-zinc-300">
              Wyczyść
            </button>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">Brak powiadomień.</p>
      ) : (
        <ul className="flex-1 divide-y divide-zinc-800/60 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
          {items.map((item) => (
            <NotifRow
              key={item.id}
              item={item}
              onOpen={() => openNotif(item)}
              onDelete={() => deleteNotif(item.id)}
            />
          ))}
        </ul>
      )}
    </>
  );

  // ── Side panel (portalised into body) ─────────────────────────────────
  const sidePanel = panelLeft !== undefined && open
    ? createPortal(
        <>
          {/* Invisible backdrop — click to close */}
          <div className="fixed inset-0 z-[190]" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            className="fixed bottom-0 top-0 z-[200] flex w-80 flex-col border-r border-zinc-800/60 bg-zinc-900 shadow-2xl"
            style={{ left: panelLeft }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/60 px-4">
              <span className="text-sm font-semibold text-zinc-200">Powiadomienia</span>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button type="button" onClick={markAllRead} className="text-xs text-zinc-500 hover:text-zinc-300">
                    Przeczytane
                  </button>
                )}
                {items.length > 0 && (
                  <button type="button" onClick={clearAll} className="text-xs text-zinc-500 hover:text-zinc-300">
                    Wyczyść
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none">×</button>
              </div>
            </div>

            {/* Items */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-zinc-500">Brak powiadomień.</p>
              ) : (
                <ul className="flex-1 divide-y divide-zinc-800/60 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
                  {items.map((item) => (
            <NotifRow
              key={item.id}
              item={item}
              onOpen={() => openNotif(item)}
              onDelete={() => deleteNotif(item.id)}
            />
          ))}
                </ul>
              )}
            </div>
          </div>
        </>,
        document.body
      )
    : null;

  // ── Legacy dropdown (when panelLeft not provided) ─────────────────────
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || panelLeft !== undefined) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, panelLeft]);

  const legacyDropdown = panelLeft === undefined && open ? (
    <div className="absolute right-0 top-full z-[200] mt-2 w-80 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950 shadow-2xl flex flex-col max-h-96">
      {panelContent}
    </div>
  ) : null;

  return (
    <>
      {toastStack}
      {sidePanel}

      {panelLeft !== undefined ? (
        // Side-panel mode: just render the trigger directly
        trigger
      ) : (
        // Legacy dropdown mode: wrap in relative container
        <div className="relative" ref={dropdownRef}>
          {trigger}
          {legacyDropdown}
        </div>
      )}
    </>
  );
}
