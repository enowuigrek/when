"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

type BookMeetingButtonProps = {
  src?: string;
  label?: string;
  className?: string;
};

export function BookMeetingButton({
  src,
  label = "Umów bezpłatną rozmowę →",
  className = "rounded-lg bg-[var(--color-accent)] px-6 py-3 font-medium text-zinc-950 transition-opacity hover:opacity-90",
}: BookMeetingButtonProps) {
  const widgetSrc = src ?? "/widget/when/demo-30-min";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const widgetEmbedSrc = `${widgetSrc}${widgetSrc.includes("?") ? "&" : "?"}embed=1&modal=${openCount}`;

  function openModal() {
    setLoading(true);
    setOpenCount((count) => count + 1);
    setOpen(true);
  }

  function resetIframeScroll(frame: HTMLIFrameElement) {
    try {
      frame.contentWindow?.scrollTo(0, 0);
      frame.contentDocument?.documentElement.scrollTo(0, 0);
      frame.contentDocument?.body.scrollTo(0, 0);
    } catch {
      // Same-origin locally, but keep the close/open flow resilient.
    }
  }

  const modal = open ? (
    <div
      className="fixed inset-0 z-[500] flex items-stretch justify-center bg-zinc-950 p-0 sm:items-center sm:bg-black/70 sm:p-8 sm:backdrop-blur-md"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 border-zinc-800 bg-zinc-950 shadow-2xl sm:h-[82dvh] sm:max-h-[680px] sm:max-w-3xl sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="hidden items-center justify-between border-b border-zinc-800 px-5 py-3 sm:flex">
          <p className="text-sm font-medium text-zinc-300">Umów bezpłatną rozmowę</p>
          <button
            onClick={() => setOpen(false)}
            className="text-2xl leading-none text-zinc-500 hover:text-zinc-100 transition-colors"
            aria-label="Zamknij"
          >
            ×
          </button>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-950/90 text-2xl leading-none text-zinc-300 shadow-lg backdrop-blur transition-colors hover:text-zinc-100 sm:hidden"
          aria-label="Zamknij"
        >
          ×
        </button>
        <iframe
          src={widgetEmbedSrc}
          onLoad={(e) => {
            resetIframeScroll(e.currentTarget);
            setLoading(false);
          }}
          className="min-h-0 flex-1 w-full border-0 bg-zinc-950"
          title="Umów rozmowę z twórcą when?"
        />
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-zinc-950 px-6 sm:top-[49px]">
            <div className="w-full max-w-xl animate-pulse space-y-5">
              <div className="space-y-2">
                <div className="h-3 w-40 rounded-full bg-zinc-800" />
                <div className="h-8 w-2/3 rounded-lg bg-zinc-900" />
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg border border-zinc-800/70 bg-zinc-900/70"
                  />
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-3 w-24 rounded-full bg-zinc-800" />
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-9 rounded-lg border border-zinc-800/70 bg-zinc-900/70" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

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
        onClick={openModal}
        className={className}
      >
        {label}
      </button>

      {modal && createPortal(modal, document.body)}
    </>
  );
}
