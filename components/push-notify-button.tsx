"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type State = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushNotifyButton() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    // Register SW and check existing subscription
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setState("unsupported"));
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC).buffer as ArrayBuffer,
      });
      const res = await fetch("/api/admin/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setState("subscribed");
    } catch {
      if (Notification.permission === "denied") setState("denied");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/admin/push-subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <p className="text-xs text-zinc-600">
        Powiadomienia push nie są obsługiwane w tej przeglądarce.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-xs text-amber-500">
        Powiadomienia zablokowane w ustawieniach przeglądarki. Odblokuj je ręcznie (kłódka przy adresie strony).
      </p>
    );
  }

  if (state === "subscribed") {
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Powiadomienia aktywne na tym urządzeniu
        </span>
        <button
          onClick={unsubscribe}
          disabled={busy}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-50"
        >
          {busy ? "…" : "Wyłącz"}
        </button>
      </div>
    );
  }

  // unsubscribed
  return (
    <button
      onClick={subscribe}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50"
    >
      {busy ? (
        "Łączenie…"
      ) : (
        <>
          <span className="text-base">🔔</span>
          Włącz powiadomienia push
        </>
      )}
    </button>
  );
}
