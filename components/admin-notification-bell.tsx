"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

type NotifItem = {
  id: string;
  customerName: string;
  serviceName: string | null;
  startsAt: string;
  createdAt: string;
  read: boolean;
};

type Toast = { id: string; customerName: string; serviceName: string | null; startsAt: string };

const STORAGE_KEY = "when_admin_notifs_v1";
const POLL_MS = 30_000;

function loadStored(): NotifItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveStored(items: NotifItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

function warsawDateStr(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function AdminNotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [open, setOpen] = useState(false);
  const initialLoad = useRef(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((i) => !i.read).length;

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const { bookings } = await res.json() as {
        bookings: { id: string; customer_name: string; created_at: string; starts_at: string; service?: { name: string } | null }[];
      };

      setItems((prev) => {
        const seenIds = new Set(prev.map((i) => i.id));
        const newItems: NotifItem[] = [];
        const newToasts: Toast[] = [];

        for (const b of bookings) {
          if (!seenIds.has(b.id)) {
            const item: NotifItem = {
              id: b.id,
              customerName: b.customer_name,
              serviceName: b.service?.name ?? null,
              startsAt: b.starts_at,
              createdAt: b.created_at,
              read: initialLoad.current,
            };
            newItems.push(item);
            if (!initialLoad.current) {
              newToasts.push({ id: b.id, customerName: b.customer_name, serviceName: b.service?.name ?? null, startsAt: b.starts_at });
            }
          }
        }

        initialLoad.current = false;
        if (newItems.length === 0) return prev;

        const merged = [...newItems, ...prev].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveStored(merged);

        if (newToasts.length > 0) {
          setToasts((t) => [...t, ...newToasts]);
        }
        return merged;
      });
    } catch {
      // network error — ignore
    }
  }, []);

  // Initial load from localStorage then poll
  useEffect(() => {
    setItems(loadStored());
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts((prev) => prev.slice(1)), 5000);
    return () => clearTimeout(t);
  }, [toasts]);

  // Close dropdown on outside click
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
    // Mark all as read when opening
    setItems((prev) => {
      const updated = prev.map((i) => ({ ...i, read: true }));
      saveStored(updated);
      return updated;
    });
  }

  function deleteNotif(id: string) {
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      saveStored(updated);
      return updated;
    });
  }

  function navigateTo(startsAt: string) {
    setOpen(false);
    const date = warsawDateStr(startsAt);
    router.push(`/admin?date=${date}`);
  }

  return (
    <>
      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700/60 bg-zinc-900 px-4 py-3 shadow-xl transition-all"
            onClick={() => {
              setToasts((prev) => prev.filter((x) => x.id !== t.id));
              navigateTo(t.startsAt);
            }}
          >
            <span className="mt-0.5 text-[var(--color-accent)]">🔔</span>
            <div>
              <p className="text-sm font-medium text-zinc-100">Nowa rezerwacja</p>
              <p className="text-xs text-zinc-400">
                {t.customerName}
                {t.serviceName ? ` · ${t.serviceName}` : ""}
              </p>
              <p className="text-xs text-zinc-500">{formatWarsawDate(t.startsAt)}, {formatWarsawTime(t.startsAt)}</p>
            </div>
          </div>
        ))}
      </div>

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
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-zinc-950">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
              <span className="text-sm font-medium text-zinc-200">Powiadomienia</span>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setItems([]);
                    saveStored([]);
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
              <ul className="max-h-96 divide-y divide-zinc-800/60 overflow-y-auto">
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
                      <p className="text-sm font-medium text-zinc-100">{item.customerName}</p>
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
