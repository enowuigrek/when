import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

type BusinessInfo = {
  name: string;
  addressStreet: string | null;
  addressPostal: string | null;
  addressCity: string | null;
  phone: string | null;
};

type ConfirmationData = {
  bookingId: string;
  customerName: string;
  serviceName: string;
  startsAtIso: string;
  endsAtIso: string;
  pricePln: number;
  notes: string | null;
  business: BusinessInfo;
  cancelUrl?: string;
  rescheduleUrl?: string;
};

export function buildConfirmationEmail(data: ConfirmationData): {
  subject: string;
  html: string;
  text: string;
} {
  const date = formatWarsawDate(data.startsAtIso);
  const start = formatWarsawTime(data.startsAtIso);
  const end = formatWarsawTime(data.endsAtIso);
  const shortId = data.bookingId.slice(0, 8).toUpperCase();
  const accent = "#d4a26a";
  const b = data.business;

  const subject = `Rezerwacja potwierdzona — ${b.name} · ${date}`;

  const phoneHref = b.phone ? `tel:${b.phone.replace(/\s/g, "")}` : null;

  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;color:#f4f4f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#18181b;border-radius:12px;border:1px solid #27272a;">
      <!-- HEADER -->
      <tr>
        <td style="padding:32px 40px 28px;border-bottom:1px solid #27272a;">
          <span style="font-size:22px;font-weight:600;color:#f4f4f5;letter-spacing:-0.5px;">
            ${b.name}<span style="color:${accent};">.</span>
          </span>
        </td>
      </tr>
      <!-- HERO -->
      <tr>
        <td style="padding:32px 40px 8px;">
          <p style="margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#71717a;">Rezerwacja potwierdzona</p>
          <h1 style="margin:0;font-size:28px;font-weight:600;color:#f4f4f5;line-height:1.25;">
            Do zobaczenia,<br/>${data.customerName.split(" ")[0]}!
          </h1>
        </td>
      </tr>
      <!-- DETAILS -->
      <tr>
        <td style="padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:8px;border:1px solid #27272a;">
            ${row("Usługa", data.serviceName)}
            ${row("Data", date)}
            ${row("Godzina", `${start} – ${end}`)}
            ${row("Cena", `${data.pricePln} zł`, true)}
            ${data.notes ? row("Uwagi", data.notes) : ""}
          </table>
        </td>
      </tr>
      <!-- ID -->
      <tr>
        <td style="padding:0 40px 16px;">
          <p style="margin:0;font-size:12px;color:#52525b;">
            Nr rezerwacji: <span style="font-family:monospace;color:#a1a1aa;">${shortId}</span>
          </p>
        </td>
      </tr>
      <!-- ACTIONS -->
      ${data.rescheduleUrl || data.cancelUrl ? `
      <tr>
        <td style="padding:0 40px 24px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              ${data.rescheduleUrl ? `<td style="padding-right:8px;"><a href="${data.rescheduleUrl}" style="display:inline-block;padding:10px 20px;background:#27272a;color:#f4f4f5;text-decoration:none;border-radius:999px;font-size:13px;font-weight:500;">Zmień termin</a></td>` : ""}
              ${data.cancelUrl ? `<td><a href="${data.cancelUrl}" style="display:inline-block;padding:10px 20px;border:1px solid #3f3f46;color:#a1a1aa;text-decoration:none;border-radius:999px;font-size:13px;">Anuluj</a></td>` : ""}
            </tr>
          </table>
        </td>
      </tr>` : ""}
      <!-- ADDRESS -->
      <tr>
        <td style="padding:0 40px 32px;border-top:1px solid #27272a;padding-top:24px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:16px 0 0;">
                <p style="margin:0;font-size:13px;color:#71717a;line-height:1.8;">
                  ${b.name}<br/>
                  ${b.addressStreet ?? ""}<br/>
                  ${b.addressPostal ?? ""} ${b.addressCity ?? ""}<br/>
                  ${phoneHref ? `<a href="${phoneHref}" style="color:${accent};text-decoration:none;">${b.phone}</a>` : ""}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- FOOTER -->
      <tr>
        <td style="padding:20px 40px;background:#09090b;border-top:1px solid #27272a;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:11px;color:#52525b;">
            Rezerwacje przez <a href="https://whenbooking.pl" style="color:#71717a;text-decoration:none;">when</a> — system rezerwacji online
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `${b.name} — Rezerwacja potwierdzona`,
    ``,
    `Cześć ${data.customerName.split(" ")[0]},`,
    `Twoja rezerwacja jest potwierdzona.`,
    ``,
    `Usługa:  ${data.serviceName}`,
    `Data:    ${date}`,
    `Godzina: ${start} – ${end}`,
    `Cena:    ${data.pricePln} zł`,
    data.notes ? `Uwagi:   ${data.notes}` : "",
    ``,
    `Nr rezerwacji: ${shortId}`,
    ``,
    `${b.name}`,
    `${b.addressStreet ?? ""}, ${b.addressPostal ?? ""} ${b.addressCity ?? ""}`,
    b.phone ?? "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { subject, html, text };
}

function row(label: string, value: string, last = false): string {
  return `
    <tr>
      <td style="padding:12px 16px;border-bottom:${last ? "none" : "1px solid #27272a"};">
        <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#52525b;margin-bottom:3px;">${label}</span>
        <span style="font-size:15px;color:#f4f4f5;">${value}</span>
      </td>
    </tr>`;
}
