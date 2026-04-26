"use client";

import { useEffect, useState } from "react";

type Props = {
  googleCalUrl: string;
  icalUrl: string;
};

function detectPlatform(): "ios" | "android" | "other" {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

export function AddToCalendarButton({ googleCalUrl, icalUrl }: Props) {
  const [platform, setPlatform] = useState<"ios" | "android" | "other" | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  // SSR: render nothing until client knows platform (avoids hydration mismatch)
  if (platform === null) return null;

  if (platform === "android") {
    return (
      <a
        href={googleCalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
      >
        <CalendarIcon /> Dodaj do kalendarza
      </a>
    );
  }

  // iOS, macOS, Windows, Linux → .ics (Apple Calendar / Outlook opens it natively)
  return (
    <a
      href={icalUrl}
      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
    >
      <CalendarIcon /> Dodaj do kalendarza
    </a>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
