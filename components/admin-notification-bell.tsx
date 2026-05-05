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

function storageKey(tenantId: string) {
  return `when_admin_notifs_v3_${tenantId}`;
}

function dismissedKey(tenantId: string) {
  return `when_admin_dismissed_v1_${tenantId}`;
}

function loadStored(tenantId: string): NotifItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey(tenantId)) ?? "[]");
  } catch {
    return [];
  }
}

function saveStored(items: NotifItem[], tenantId: string) {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(items.slice(0, 50)));
}

function loadDismissed(tenantId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(dismissedKey(tenantId)) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>, tenantId: string) {
  // Keep last 500 dismissed IDs — enough to never resurface deleted notifs
  localStorage.setItem(dismissedKey(tenantId), JSON.stringify([...ids].slice(-500)));
}

function warsawDateStr(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

const TITLE: Record<EventType, string> = {
  created: "Nowa rezerwacja",
  rescheduled: "Zmiana terminu",
  cancelled: "Anulowana rezerwacja",
};

const ICON: Record<EventType, string> = {
  created: "🟢",
  rescheduled: "🔄",
  cancelled: "🔴",
};

const ACCENT: Record<EventType, string> = {
  created: "text-emerald-400",
  rescheduled: "text-blue-400",
  cancelled: "text-red-400",
};

export function AdminNotificationBell({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [open, setOpen] = useState(false);
  const initialLoad = useRef(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Stable ref for dismissed IDs — checked in poll() without needing re-render
  const dismissedRef = useRef<Set<string>>(new Set());

  const unread = items.filter((i) => !i.read).length;

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const { events } = await res.json() as { events: RawEvent[] };

      setItems((prev) => {
        // Combine currently-visible IDs + permanently-dismissed IDs so deleted
        // notifications are never re-added by the next poll.
        const seenIds = new Set([...prev.map((i) => i.id), ...dismissedRef.current]);
        const newItems: NotifItem[] = [];
        const newToasts: Toast[] = [];

        for (const e of events) {
          if (!seenIds.has(e.id)) {
            // Skip self-generated admin events from showing as toasts (admin
            // already saw them in their own UI), but still show in dropdown.
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
            if (!initialLoad.current && e.source === "customer") {
              newToasts.push(item);
            }
          }
        }

        initialLoad.current = false;
        if (newItems.length === 0) return prev;

        const merged = [...newItems, ...prev].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveStored(merged, tenantId);

        if (newToasts.length > 0) {
          setToasts((t) => [...t, ...newToasts]);
        }
        return merged;
      });
    } catch {
      // network error — ignore
    }
  }, []);

  useEffect(() => {
    dismissedRef.current = loadDismissed(tenantId);
    setItems(loadStored(tenantId));
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts((prev) => prev.slice(1)), 5000);
    return () => clearTimeout(t);
  }, [toasts]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function openDropdown() {
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
    // Permanently mark as dismissed so it won't come back on next poll
    dismissedRef.current.add(id);
    saveDismissed(dismissedRef.current, tenantId);
  }

  function navigateTo(startsAt: string) {
    setOpen(false);
    const date = warsawDateStr(startsAt);
    router.push(`/admin/harmonogram?widok=dzien&od=${date}`);
  }

  // Portal the toast stack to document.body so it's never trapped inside
  // a backdrop-filter stacking context (the admin header uses backdrop-blur
  // which makes position:fixed children position relative to the header).
  const toastStack = toasts.length > 0
    ? createPortal(
        <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700/60 bg-zinc-900 px-4 py-3 shadow-xl transition-all"
              onClick={() => {
                setToasts((prev) => prev.filter((x) => x.id !== t.id));
                navigateTo(t.startsAt);
              }}
            >
              <span className="mt-0.5">{ICON[t.eventType]}</span>
              <div>
                <p className={`text-sm font-medium ${ACCENT[t.eventType]}`}>{TITLE[t.eventType]}</p>
                <p className="text-xs text-zinc-300">
                  {t.customerName}
                  {t.serviceName ? ` · ${t.serviceName}` : ""}
                </p>
                <p className="text-xs text-zinc-500">{formatWarsawDate(t.startsAt)}, {formatWarsawTime(t.startsAt)}</p>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {toastStack}

      {/* Bell button + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={openDropdown}
          className="relative rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
          aria-label="Powiadomienia"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--color-accent)] px-0.5 text-[10px] font-bold text-zinc-950">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full z-[200] mt-2 w-80 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
              <span className="text-sm font-medium text-zinc-200">Powiadomienia</span>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    // Mark every visible item as dismissed before clearing
                    items.forEach((i) => dismissedRef.current.add(i.id));
                    saveDismissed(dismissedRef.current, tenantId);
                    setItems([]);
                    saveStored([], tenantId);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Wyczyść wszystkie
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Brak powiadomień.</p>
            ) : (
              <ul className="max-h-96 divide-y divide-zinc-800/60 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-start gap-3 px-4 py-3 ${item.read ? "" : "bg-zinc-900/60"}`}
                  >
                    {!item.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
                    )}
                    <button
                      type="button"
                      onClick={() => navigateTo(item.startsAt)}
                      className={`flex-1 text-left ${item.read ? "pl-5" : ""}`}
                    >
                      <p className={`text-sm font-medium ${ACCENT[item.eventType]}`}>
                        {ICON[item.eventType]} {TITLE[item.eventType]}
                      </p>
                      <p className="text-sm text-zinc-100">{item.customerName}</p>
                      {item.serviceName && (
                        <p className="text-xs text-zinc-400">{item.serviceName}</p>
                      )}
                      <p className="text-xs text-zinc-500">
                        {formatWarsawDate(item.startsAt)}, {formatWarsawTime(item.startsAt)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNotif(item.id)}
                      className="ml-1 shrink-0 text-zinc-600 hover:text-zinc-300"
                      aria-label="Usuń"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
