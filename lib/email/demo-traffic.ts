/**
 * "Ktoś ogląda demo" — mail do mnie, nie do klienta.
 *
 * Jedyny mail w tym projekcie, którego adresatem jest właściciel WHEN,
 * a nie właściciel salonu. Stąd ton: to notatka do siebie, nie komunikacja
 * marki, więc bez logo, bez stopki i bez zachęt do działania.
 *
 * Wysyłany raz na dzień na demo, przy pierwszym wejściu. Nie przy każdej
 * odsłonie: prospekt klikający po panelu wygenerowałby kilkanaście maili
 * w kwadrans i następnym razem przestałbyś je czytać.
 */

export type DemoTrafficData = {
  businessName: string;
  slug: string;
  /** Odsłon dzisiaj. */
  views: number;
  /** Ile różnych stron otworzył. */
  pages: number;
  /** Czy zajrzał na stronę zapisów, czy tylko do panelu. */
  sawCustomerView: boolean;
  /** "14:32" — pierwsze wejście dzisiaj, czas warszawski. */
  firstAt: string;
  /** "14:51" — ostatnie znane w chwili wysyłki. */
  lastAt: string;
  /** Pełny adres panelu dema. */
  panelUrl: string;
};

export function buildDemoTrafficEmail(d: DemoTrafficData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `${d.businessName}: ktoś ogląda demo`;

  // Jedna odsłona i jedna strona to ktoś, kto otworzył link i zamknął;
  // kilkanaście odsłon na kilku stronach to ktoś, kto naprawdę klika.
  // Warto, żeby to było widać bez wchodzenia do Zarządcy.
  const depth =
    d.pages === 1
      ? "otworzył tylko pierwszy ekran"
      : `obejrzał ${d.pages} różnych stron`;

  const where = d.sawCustomerView
    ? "Był w panelu i na stronie zapisów."
    : "Tylko panel — strony zapisów nie otwierał.";

  const lines = [
    `${d.businessName} (${d.slug})`,
    ``,
    `Pierwsze wejście dziś: ${d.firstAt}`,
    `Ostatnie: ${d.lastAt}`,
    `${d.views} odsłon, ${depth}.`,
    where,
    ``,
    d.panelUrl,
  ];

  const text = lines.join("\n");

  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px;background:#09090b;font-family:system-ui,-apple-system,sans-serif;color:#f4f4f5;">
  <div style="max-width:420px;margin:0 auto;">
    <p style="margin:0 0 4px;font-size:18px;font-weight:600;">${esc(d.businessName)}</p>
    <p style="margin:0 0 20px;font-family:ui-monospace,monospace;font-size:12px;color:#71717a;">${esc(d.slug)}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#d4d4d8;">
      <tr><td style="padding:3px 0;color:#71717a;">Pierwsze wejście</td><td style="padding:3px 0;text-align:right;font-family:ui-monospace,monospace;">${esc(d.firstAt)}</td></tr>
      <tr><td style="padding:3px 0;color:#71717a;">Ostatnie</td><td style="padding:3px 0;text-align:right;font-family:ui-monospace,monospace;">${esc(d.lastAt)}</td></tr>
      <tr><td style="padding:3px 0;color:#71717a;">Odsłon</td><td style="padding:3px 0;text-align:right;font-family:ui-monospace,monospace;">${d.views}</td></tr>
      <tr><td style="padding:3px 0;color:#71717a;">Stron</td><td style="padding:3px 0;text-align:right;font-family:ui-monospace,monospace;">${d.pages}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#a1a1aa;">${esc(where)}</p>
    <p style="margin:24px 0 0;">
      <a href="${esc(d.panelUrl)}" style="color:#d4a26a;font-size:14px;">Otwórz demo →</a>
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
