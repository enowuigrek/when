"use client";

import { useState } from "react";

/** Copies a demo link, so it can go straight into an email. */
export function CopyLinkButton({ url }: { url: string }) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked — the link is on screen to copy by hand */
        }
      }}
      className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500"
    >
      {done ? "Skopiowano" : "Kopiuj link"}
    </button>
  );
}
