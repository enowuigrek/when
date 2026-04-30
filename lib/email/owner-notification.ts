import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

type OwnerNotificationData = {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  serviceName: string;
  staffName?: string | null;
  startsAtIso: string;
  endsAtIso: string;
  pricePln: number;
  notes?: string | null;
  businessName: string;
  /** Link to admin dashboard */
  adminUrl: string;
};

export function buildOwnerNotificationEmail(data: OwnerNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const date = formatWarsawDate(data.startsAtIso);
  const start = formatWarsawTime(data.startsAtIso);
  const end = formatWarsawTime(data.endsAtIso);
  const shortId = data.bookingId.slice(0, 8).toUpperCase();
  const accent = "#d4a26a";

  const subject = `Nowa rezerwacja — ${data.customerName} · ${date} ${start}`;

  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;color:#f4f4f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#18181b;border-radius:12px;border:1px solid #27272a;">
      <!-- HEADER -->
      <tr>
        <td style="padding:24px 32px;border-bottom:1px solid #27272a;">
          <span style="font-size:18px;font-weight:600;color:#f4f4f5;letter-spacing:-0.3px;">
            ${data.businessName}<span style="color:${accent};">.</span>
          </span>
          <span style="margin-left:12px;display:inline-block;background:${accent}20;border:1px solid ${accent}40;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:600;color:${accent};letter-spacing:.5px;text-transform:uppercase;vertical-align:middle;">
            Nowa rezerwacja
          </span>
        </td>
      </tr>
      <!-- CLIENT -->
      <tr>
        <td style="padding:24px 32px 0;">
          <p style="margin:0 0 4px;font-size:20px;font-weight:600;color:#f4f4f5;">${data.customerName}</p>
          <p style="margin:0;font-size:14px;color:#a1a1aa;font-family:monospace;">${data.customerPhone}</p>
          ${data.customerEmail ? `<p style="margin:4px 0 0;font-size:13px;color:#71717a;">${data.customerEmail}</p>` : ""}
        </td>
      </tr>
      <!-- DETAILS -->
      <tr>
        <td style="padding:16px 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:8px;border:1px solid #27272a;">
            ${notifRow("Usługa", data.serviceName)}
            ${notifRow("Data", `${date}, ${start} – ${end}`)}
            ${data.staffName ? notifRow("Pracownik", data.staffName) : ""}
            ${notifRow("Cena", `${data.pricePln} zł`, !data.notes)}
            ${data.notes ? notifRow("Uwagi", data.notes, true) : ""}
          </table>
          <p style="margin:10px 0 0;font-size:11px;color:#52525b;">Nr: ${shortId}</p>
        </td>
      </tr>
      <!-- CTA -->
      <tr>
        <td style="padding:0 32px 28px;">
          <a href="${data.adminUrl}" style="display:inline-block;padding:11px 24px;background:${accent};color:#09090b;text-decoration:none;border-radius:999px;font-size:13px;font-weight:700;">
            Otwórz panel →
          </a>
        </td>
      </tr>
      <!-- FOOTER -->
      <tr>
        <td style="padding:16px 32px;background:#09090b;border-top:1px solid #27272a;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:11px;color:#52525b;">
            Powiadomienie od <a href="https://whenbooking.pl" style="color:#71717a;text-decoration:none;">when</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `Nowa rezerwacja — ${data.businessName}`,
    ``,
    `Klient: ${data.customerName}`,
    `Tel:    ${data.customerPhone}`,
    data.customerEmail ? `Email:  ${data.customerEmail}` : null,
    ``,
    `Usługa:  ${data.serviceName}`,
    `Data:    ${date}`,
    `Godzina: ${start} – ${end}`,
    data.staffName ? `Pracownik: ${data.staffName}` : null,
    `Cena:    ${data.pricePln} zł`,
    data.notes ? `Uwagi:   ${data.notes}` : null,
    ``,
    `Nr: ${shortId}`,
    ``,
    `Panel: ${data.adminUrl}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return { subject, html, text };
}

function notifRow(label: string, value: string, last = false): string {
  return `
    <tr>
      <td style="padding:10px 14px;border-bottom:${last ? "none" : "1px solid #27272a"};">
        <span style="display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#52525b;width:80px;">${label}</span>
        <span style="font-size:14px;color:#f4f4f5;">${value}</span>
      </td>
    </tr>`;
}
