"use client";

import { useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.whenbooking.pl";

type Tab = "iframe" | "popup";

function buildIframeSnippet(widgetUrl: string) {
  return `<iframe
  src="${widgetUrl}"
  width="100%"
  height="640"
  style="border:none;border-radius:12px;max-width:480px"
  loading="lazy"
  title="Rezerwacje online"
></iframe>`;
}

function buildPopupSnippet(widgetUrl: string) {
  // Single self-contained snippet — no external deps
  return `<!-- WHEN Booking Widget -->
<div id="when-booking-widget"></div>
<script>
(function(){
  var url="${widgetUrl}?embed=1";
  var root=document.getElementById("when-booking-widget");
  var btn=document.createElement("button");
  btn.textContent="Zarezerwuj wizytę";
  btn.style.cssText="background:#d4a26a;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;letter-spacing:.01em";
  root.appendChild(btn);
  btn.addEventListener("click",function(){
    if(document.getElementById("when-overlay"))return;
    var ov=document.createElement("div");
    ov.id="when-overlay";
    ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px";
    var box=document.createElement("div");
    box.style.cssText="background:#09090b;border-radius:16px;width:100%;max-width:500px;height:88vh;max-height:760px;overflow:hidden;position:relative;display:flex;flex-direction:column";
    var cls=document.createElement("button");
    cls.innerHTML="&times;";
    cls.style.cssText="position:absolute;top:10px;right:14px;background:rgba(255,255,255,.12);border:none;color:#fff;width:30px;height:30px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center";
    var fr=document.createElement("iframe");
    fr.src=url;
    fr.style.cssText="flex:1;border:none;width:100%;height:100%";
    fr.title="Rezerwacja online";
    fr.allow="payment";
    function close(){
      document.body.removeChild(ov);
      document.body.style.overflow="";
    }
    cls.addEventListener("click",close);
    ov.addEventListener("click",function(e){if(e.target===ov)close();});
    box.appendChild(cls);
    box.appendChild(fr);
    ov.appendChild(box);
    document.body.appendChild(ov);
    document.body.style.overflow="hidden";
  });
})();
<\/script>`;
}

export function EmbedSnippet({ tenantSlug }: { tenantSlug: string }) {
  const widgetUrl = `${BASE_URL}/widget/${tenantSlug}`;
  const [tab, setTab] = useState<Tab>("popup");
  const [copied, setCopied] = useState(false);

  const snippet = tab === "iframe"
    ? buildIframeSnippet(widgetUrl)
    : buildPopupSnippet(widgetUrl);

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

      {/* Tab switcher */}
      <div className="flex items-center gap-1 rounded-lg border border-zinc-800 p-1 w-fit">
        <button
          onClick={() => setTab("popup")}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            tab === "popup"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Popup (zalecane)
        </button>
        <button
          onClick={() => setTab("iframe")}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            tab === "iframe"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Iframe
        </button>
      </div>

      {/* Description */}
      {tab === "popup" ? (
        <p className="text-xs text-zinc-500">
          Wklej w dowolne miejsce na stronie. Pojawi się przycisk <strong className="text-zinc-400">„Zarezerwuj wizytę"</strong> — po kliknięciu otworzy się panel rezerwacji nad Twoją stroną.
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Wstaw widget bezpośrednio w treść strony jako ramkę iframe. Możesz dostosować <code className="text-zinc-400">width</code> i <code className="text-zinc-400">height</code> według potrzeb.
        </p>
      )}

      {/* Code block */}
      <div className="relative rounded-xl border border-zinc-800/60 bg-zinc-950">
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-400 whitespace-pre-wrap break-all sm:break-normal sm:whitespace-pre">
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
        Działa na każdej stronie HTML, WordPress, Wix, Webflow itp.
        Kolor przycisku możesz zmienić edytując <code className="text-zinc-500">#d4a26a</code> w kodzie.
      </p>
    </div>
  );
}
