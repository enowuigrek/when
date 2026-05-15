"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateFeedbackStatusAction } from "../[id]/actions";
import type { FeedbackRow } from "@/lib/db/super-admin";

const statusLabels: Record<string, string> = { new: "Nowa", read: "Przeczytana", resolved: "Rozwiązana" };
const categoryLabels: Record<string, string> = { general: "Ogólne", bug: "Błąd", feature: "Pomysł", question: "Pytanie" };
const statusColors: Record<string, string> = {
  new: "bg-red-500/15 text-red-400",
  read: "bg-amber-500/15 text-amber-400",
  resolved: "bg-emerald-500/15 text-emerald-400",
};

export function FeedbackItem({ feedback: f }: { feedback: FeedbackRow }) {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState(f.admin_reply ?? "");
  const [pending, startTransition] = useTransition();

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("feedbackId", f.id);
      fd.set("status", newStatus);
      if (reply) fd.set("adminReply", reply);
      await updateFeedbackStatusAction(fd);
    });
  }

  function handleReply() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("feedbackId", f.id);
      fd.set("status", f.status === "new" ? "read" : f.status);
      fd.set("adminReply", reply);
      await updateFeedbackStatusAction(fd);
    });
  }

  const date = new Date(f.created_at).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link
          href={`/admin/wszystko/${f.tenant_id}`}
          className="font-medium text-zinc-200 hover:text-[var(--color-accent)] transition-colors"
        >
          {f.tenant_name}
        </Link>
        <span className={`rounded px-1.5 py-0.5 ${statusColors[f.status] ?? ""}`}>
          {statusLabels[f.status] ?? f.status}
        </span>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
          {categoryLabels[f.category] ?? f.category}
        </span>
        <span className="text-zinc-600">{date}</span>
      </div>

      {/* Message */}
      <p className="mt-2 text-sm text-zinc-300">{f.message}</p>

      {/* Admin reply (if exists and not editing) */}
      {f.admin_reply && !expanded && (
        <div className="mt-2 rounded-md bg-zinc-800/50 p-2">
          <p className="text-xs text-zinc-500">Twoja odpowiedź:</p>
          <p className="mt-0.5 text-sm text-zinc-400">{f.admin_reply}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
        >
          {expanded ? "Schowaj" : "Odpowiedz"}
        </button>
        {f.status === "new" && (
          <button
            type="button"
            onClick={() => handleStatusChange("read")}
            disabled={pending}
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50"
          >
            Oznacz jako przeczytane
          </button>
        )}
        {f.status !== "resolved" && (
          <button
            type="button"
            onClick={() => handleStatusChange("resolved")}
            disabled={pending}
            className="rounded-md border border-emerald-800 px-2.5 py-1 text-xs text-emerald-400 transition-colors hover:border-emerald-600 disabled:opacity-50"
          >
            Rozwiązane
          </button>
        )}
      </div>

      {/* Reply form */}
      {expanded && (
        <div className="mt-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Wpisz odpowiedź…"
            className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleReply}
            disabled={pending || !reply.trim()}
            className="mt-2 rounded-lg bg-zinc-800 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Zapisuję…" : "Zapisz odpowiedź"}
          </button>
        </div>
      )}
    </div>
  );
}
