import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

type BusinessInfo = {
  name: string;
  siteUrl: string;
};

type CancellationData = {
  bookingId: string;
  customerName: string;
  serviceName: string;
  startsAtIso: string;
  reason: string | null;
  business: BusinessInfo;
};

export function buildCancellationEmail(data: CancellationData): {
  subject: string;
  html: string;
  text: string;
} {
  const date = formatWarsawDate(data.startsAtIso);
  const time = formatWarsawTime(data.startsAtIso);
  const shortId = data.bookingId.slice(0, 8).toUpperCase();
  const accent = "#d4a26a";
  const b = data.business;

  const subject = `Rezerwacja anulowana — ${b.name} · ${date}`;

  const ctaHref = `${b.siteUrl}/rezerwacja`;

  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;color:#f4f4f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#18181b;border-radius:12px;border:1px solid #27272a;">
      <tr>
        <td style="padding:32px 40px 28px;border-bottom:1px solid #27272a;">
          <span style="font-size:22px;font-weight:600;color:#f4f4f5;letter-spacing:-0.5px;">
            ${b.name}<span style="color:${accent};">.</span>
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 40px 8px;">
          <p style="margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#71717a;">Rezerwacja anulowana</p>
          <h1 style="margin:0;font-size:28px;font-weight:600;color:#f4f4f5;line-height:1.25;">
            Przepraszamy,<br/>${data.customerName.split(" ")[0]}.
          </h1>
          <p style="margin:12px 0 0;color:#a1a1aa;font-size:15px;">
            Twoja rezerwacja została anulowana. Zapraszamy do ponownej rezerwacji.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:8px;border:1px solid #27272a;">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #27272a;">
                <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#52525b;margin-bottom:3px;">Usługa</span>
                <span style="font-size:15px;color:#f4f4f5;">${data.serviceName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:${data.reason ? "1px solid #27272a" : "none"};">
                <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#52525b;margin-bottom:3px;">Anulowany termin</span>
                <span style="font-size:15px;color:#f4f4f5;">${date}, godz. ${time}</span>
              </td>
            </tr>
            ${data.reason ? `
            <tr>
              <td style="padding:12px 16px;">
                <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#52525b;margin-bottom:3px;">Powód</span>
                <span style="font-size:15px;color:#f4f4f5;">${data.reason}</span>
              </td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px 24px;">
          <a href="${ctaHref}" style="display:inline-block;margin-top:4px;padding:12px 24px;background:${accent};color:#09090b;font-weight:600;text-decoration:none;border-radius:999px;font-size:14px;">
            Zarezerwuj ponownie →
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 40px;background:#09090b;border-top:1px solid #27272a;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:11px;color:#52525b;">
            Nr rezerwacji: <span style="font-family:monospace;color:#71717a;">${shortId}</span>
            &nbsp;·&nbsp; Zbudowane na <span style="color:#71717a;">when?</span>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `${b.name} — Rezerwacja anulowana`,
    ``,
    `Cześć ${data.customerName.split(" ")[0]},`,
    `Twoja rezerwacja została anulowana.`,
    ``,
    `Usługa: ${data.serviceName}`,
    `Termin: ${date}, godz. ${time}`,
    data.reason ? `Powód: ${data.reason}` : "",
    ``,
    `Nr rezerwacji: ${shortId}`,
    ``,
    `Zapraszamy do ponownej rezerwacji na ${b.name}.`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { subject, html, text };
}
