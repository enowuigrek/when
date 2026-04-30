"use client";

import { useState, useEffect } from "react";

export function BookMeetingButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[var(--color-accent)] px-6 py-3 font-medium text-zinc-950 transition-opacity hover:opacity-90"
      >
        Umów bezpłatną rozmowę →
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
              <p className="text-sm font-medium text-zinc-300">Umów bezpłatną rozmowę</p>
              <button
                onClick={() => setOpen(false)}
                className="text-2xl leading-none text-zinc-500 hover:text-zinc-100 transition-colors"
                aria-label="Zamknij"
              >
                ×
              </button>
            </div>
            <iframe
              src="/widget/when/demo-30-min?embed=1"
              className="flex-1 w-full border-0"
              title="Umów rozmowę z twórcą when?"
            />
          </div>
        </div>
      )}
    </>
  );
}
