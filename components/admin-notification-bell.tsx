"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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
  eventType: EventType;
  source: EventSource;
  customerName: string;
  serviceName: string | null;
  startsAt: string;
  createdAt: string;
  read: boolean;
};

type Toast = NotifItem;

const POLL_MS = 30_000;

function notifsKey(tenantId: string) { return `when_admin_notifs_v3_${tenantId}`; }
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
const ICON: Record<EventType, string> = {
  created: "🟢", rescheduled: "🔄", cancelled: "🔴",
};
const ACCENT: Record<EventType, string> = {
  created: "text-emerald-400",
  rescheduled: "text-blue-400",
  cancelled: "text-red-400",
};

// ── Bell SVG ──────────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
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
  const [items, setItems] = useState<NotifItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [open, setOpen] = useState(false);
  const initialLoad = useRef(true);
  const cursorRef = useRef<string | null>(null);

  const unread = items.filter((i) => !i.read).length;

  const poll = useCallback(async () => {
    try {
      const since = cursorRef.current;
      const url = since
        ? `/api/admin/notifications?since=${encodeURIComponent(since)}`
        : "/api/admin/notifications";
      const res = await fetch(url);
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
  }, [tenantId]);

  useEffect(() => {
    cursorRef.current = loadCursor(tenantId);
    setItems(loadStored(tenantId));
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [poll, tenantId]);

  // Auto-dismiss toasts after 5 s
  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts((prev) => prev.slice(1)), 5000);
    return () => clearTimeout(t);
  }, [toasts]);

  function openPanel() {
    setOpen((v) => !v);
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

  function navigateTo(startsAt: string) {
    setOpen(false);
    router.push(`/admin/harmonogram?widok=dzien&od=${warsawDateStr(startsAt)}`);
  }

  // ── Toast portal (always rendered into body) ──────────────────────────
  const toastStack = toasts.length > 0
    ? createPortal(
        <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700/60 bg-zinc-900 px-4 py-3 shadow-xl"
              onClick={() => { setToasts((p) => p.filter((x) => x.id !== t.id)); navigateTo(t.startsAt); }}
            >
              <span className="mt-0.5">{ICON[t.eventType]}</span>
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
        open ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/35 hover:text-zinc-100"
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
      className="relative rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800/35 hover:text-zinc-100"
      aria-label="Powiadomienia"
    >
      <BellIcon />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--color-accent)] px-0.5 text-[10px] font-bold text-zinc-950">
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
        {items.length > 0 && (
          <button type="button" onClick={clearAll} className="text-xs text-zinc-500 hover:text-zinc-300">
            Wyczyść wszystkie
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">Brak powiadomień.</p>
      ) : (
        <ul className="flex-1 divide-y divide-zinc-800/60 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
          {items.map((item) => (
            <li key={item.id} className={`flex items-start gap-3 px-4 py-3 ${item.read ? "" : "bg-zinc-900/60"}`}>
              {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />}
              <button
                type="button"
                onClick={() => navigateTo(item.startsAt)}
                className={`flex-1 text-left ${item.read ? "pl-5" : ""}`}
              >
                <p className={`text-sm font-medium ${ACCENT[item.eventType]}`}>{ICON[item.eventType]} {TITLE[item.eventType]}</p>
                <p className="text-sm text-zinc-100">{item.customerName}</p>
                {item.serviceName && <p className="text-xs text-zinc-400">{item.serviceName}</p>}
                <p className="text-xs text-zinc-500">{formatWarsawDate(item.startsAt)}, {formatWarsawTime(item.startsAt)}</p>
              </button>
              <button type="button" onClick={() => deleteNotif(item.id)} className="ml-1 shrink-0 text-zinc-600 hover:text-zinc-300" aria-label="Usuń">×</button>
            </li>
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
                    <li key={item.id} className={`flex items-start gap-3 px-4 py-3 ${item.read ? "" : "bg-zinc-900/60"}`}>
                      {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />}
                      <button
                        type="button"
                        onClick={() => navigateTo(item.startsAt)}
                        className={`flex-1 text-left ${item.read ? "pl-5" : ""}`}
                      >
                        <p className={`text-sm font-medium ${ACCENT[item.eventType]}`}>{ICON[item.eventType]} {TITLE[item.eventType]}</p>
                        <p className="text-sm text-zinc-100">{item.customerName}</p>
                        {item.serviceName && <p className="text-xs text-zinc-400">{item.serviceName}</p>}
                        <p className="text-xs text-zinc-500">{formatWarsawDate(item.startsAt)}, {formatWarsawTime(item.startsAt)}</p>
                      </button>
                      <button type="button" onClick={() => deleteNotif(item.id)} className="ml-1 shrink-0 text-zinc-600 hover:text-zinc-300 text-lg leading-none" aria-label="Usuń">×</button>
                    </li>
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
