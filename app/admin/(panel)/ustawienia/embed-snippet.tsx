"use client";

import { useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://when-three.vercel.app";

export function EmbedSnippet({ tenantSlug }: { tenantSlug: string }) {
  const widgetUrl = `${BASE_URL}/widget/${tenantSlug}`;
  const snippet = `<iframe
  src="${widgetUrl}"
  width="100%"
  height="640"
  style="border:none;border-radius:12px;max-width:480px"
  loading="lazy"
  title="Rezerwacje online"
></iframe>`;

  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      {/* Preview link */}
      <div className="flex items-center gap-3">
        <a
          href={widgetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          ↗ Podgląd widgetu
        </a>
        <span className="font-mono text-xs text-zinc-600 truncate max-w-xs">{widgetUrl}</span>
      </div>

      {/* Code */}
      <div className="relative rounded-xl border border-zinc-800/60 bg-zinc-950">
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-400">
          <code>{snippet}</code>
        </pre>
        <button
          onClick={copy}
          className="absolute right-3 top-3 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
        >
          {copied ? "✓ Skopiowano" : "Kopiuj"}
        </button>
      </div>

      <p className="text-xs text-zinc-600">
        Widget działa na każdej stronie HTML, WordPress, Wix, Webflow itp. Możesz zmienić <code className="text-zinc-500">width</code> i <code className="text-zinc-500">height</code> według potrzeb.
      </p>
    </div>
  );
}
