"use client";

import { useState, useEffect } from "react";

export function BookMeetingButton({ src }: { src?: string }) {
  const widgetSrc = src ?? "/widget/when/demo-30-min";
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
          className="fixed inset-0 z-[500] flex items-stretch justify-center bg-zinc-950 p-0 sm:items-center sm:bg-black/80 sm:p-4 sm:backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 border-zinc-800 bg-zinc-950 shadow-2xl sm:h-[90vh] sm:max-w-lg sm:rounded-2xl sm:border"
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
              src={`${widgetSrc}?embed=1`}
              className="min-h-0 flex-1 w-full border-0"
              title="Umów rozmowę z twórcą when?"
            />
          </div>
        </div>
      )}
    </>
  );
}
