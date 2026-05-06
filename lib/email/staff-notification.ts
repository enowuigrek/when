import { formatWarsawDate, formatWarsawTime } from "@/lib/slots";

export type StaffNotifType =
  | "booked"          // klient zapisał się bezpośrednio do tego pracownika
  | "assigned"        // admin przypisał pracownika do istniejącej rezerwacji
  | "rescheduled"     // termin zmieniony, pracownik pozostaje ten sam
  | "reassigned_to"   // pracownik przejął rezerwację od kogoś innego
  | "unassigned";     // pracownik usunięty z rezerwacji (przekazanej dalej)

type StaffNotifData = {
  type: StaffNotifType;
  staffName: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  startsAtIso: string;
  endsAtIso: string;
  businessName: string;
  adminUrl: string;
  /** For reassigned_to: kto był poprzednim pracownikiem */
  previousStaffName?: string | null;
  /** For unassigned: do kogo przekazano */
  newStaffName?: string | null;
};

const accent = "#d4a26a";

const BADGE: Record<StaffNotifType, { label: string; color: string; bg: string }> = {
  booked:        { label: "Nowa rezerwacja",     color: "#86efac", bg: "#14532d30" },
  assigned:      { label: "Przypisano Cię",       color: "#93c5fd", bg: "#1e3a5f30" },
  rescheduled:   { label: "Zmiana terminu",       color: "#fcd34d", bg: "#78350f30" },
  reassigned_to: { label: "Przejęta rezerwacja",  color: "#c4b5fd", bg: "#4c1d9530" },
  unassigned:    { label: "Usunięto z rezerwacji",color: "#fca5a5", bg: "#7f1d1d30" },
};

const SUBJECT: Record<StaffNotifType, (d: StaffNotifData, date: string, time: string) => string> = {
  booked:        (d, date, time) => `Nowa rezerwacja — ${d.customerName} · ${date} ${time}`,
  assigned:      (d, date, time) => `Przypisano Cię — ${d.customerName} · ${date} ${time}`,
  rescheduled:   (d, date, time) => `Zmiana terminu — ${d.customerName} · ${date} ${time}`,
  reassigned_to: (d, date, time) => `Przejęta rezerwacja — ${d.customerName} · ${date} ${time}`,
  unassigned:    (d)             => `Usunięto Cię z rezerwacji — ${d.customerName}`,
};

function row(label: string, value: string, last = false): string {
  return `
    <tr>
      <td style="padding:10px 14px;border-bottom:${last ? "none" : "1px solid #27272a"};">
        <span style="display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#52525b;width:80px;">${label}</span>
        <span style="font-size:14px;color:#f4f4f5;">${value}</span>
      </td>
    </tr>`;
}

export function buildStaffNotificationEmail(data: StaffNotifData): {
  subject: string;
  html: string;
  text: string;
} {
  const date = formatWarsawDate(data.startsAtIso);
  const start = formatWarsawTime(data.startsAtIso);
  const end = formatWarsawTime(data.endsAtIso);

  const badge = BADGE[data.type];
  const subject = SUBJECT[data.type](data, date, start);

  const contextNote: string = (() => {
    switch (data.type) {
      case "booked":
        return `Klient <strong style="color:#f4f4f5">${data.customerName}</strong> zapisał(a) się do Ciebie.`;
      case "assigned":
        return `Zostałeś/aś przypisany/a do tej rezerwacji przez managera.`;
      case "rescheduled":
        return `Termin tej rezerwacji został zmieniony na podany poniżej.`;
      case "reassigned_to":
        return data.previousStaffName
          ? `Przejąłeś/aś tę rezerwację od <strong style="color:#f4f4f5">${data.previousStaffName}</strong>.`
          : `Przejąłeś/aś tę rezerwację.`;
      case "unassigned":
        return data.newStaffName
          ? `Zostałeś/aś usunięty/a z tej rezerwacji. Przekazano do: <strong style="color:#f4f4f5">${data.newStaffName}</strong>.`
          : `Zostałeś/aś usunięty/a z tej rezerwacji.`;
    }
  })();

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
          <span style="margin-left:12px;display:inline-block;background:${badge.bg};border:1px solid ${badge.color}40;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:600;color:${badge.color};letter-spacing:.5px;text-transform:uppercase;vertical-align:middle;">
            ${badge.label}
          </span>
        </td>
      </tr>
      <!-- GREETING -->
      <tr>
        <td style="padding:24px 32px 0;">
          <p style="margin:0 0 4px;font-size:15px;color:#a1a1aa;">Cześć, <strong style="color:#f4f4f5">${data.staffName}</strong>!</p>
          <p style="margin:8px 0 0;font-size:14px;color:#a1a1aa;line-height:1.5;">${contextNote}</p>
        </td>
      </tr>
      <!-- DETAILS -->
      <tr>
        <td style="padding:16px 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:8px;border:1px solid #27272a;">
            ${row("Klient", data.customerName)}
            ${row("Telefon", data.customerPhone)}
            ${row("Usługa", data.serviceName)}
            ${data.type === "unassigned"
              ? row("Termin", `${date}, ${start} – ${end}`, true)
              : row("Data", `${date}, ${start} – ${end}`, true)}
          </table>
        </td>
      </tr>
      ${data.type !== "unassigned" ? `
      <!-- CTA -->
      <tr>
        <td style="padding:0 32px 28px;">
          <a href="${data.adminUrl}" style="display:inline-block;padding:11px 24px;background:${accent};color:#09090b;text-decoration:none;border-radius:999px;font-size:13px;font-weight:700;">
            Otwórz harmonogram →
          </a>
        </td>
      </tr>` : ""}
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

  const textLines: (string | null)[] = [
    `${badge.label} — ${data.businessName}`,
    ``,
    data.type === "booked"        ? `Klient ${data.customerName} zapisał(a) się do Ciebie.` : null,
    data.type === "assigned"      ? `Zostałeś/aś przypisany/a do rezerwacji przez managera.` : null,
    data.type === "rescheduled"   ? `Termin rezerwacji został zmieniony.` : null,
    data.type === "reassigned_to" ? `Przejąłeś/aś rezerwację${data.previousStaffName ? ` od ${data.previousStaffName}` : ""}.` : null,
    data.type === "unassigned"    ? `Usunięto Cię z rezerwacji${data.newStaffName ? `. Przekazano do: ${data.newStaffName}` : ""}.` : null,
    ``,
    `Klient:  ${data.customerName}`,
    `Telefon: ${data.customerPhone}`,
    `Usługa:  ${data.serviceName}`,
    `Data:    ${date}, ${start} – ${end}`,
    ``,
    data.type !== "unassigned" ? `Panel: ${data.adminUrl}` : null,
  ];

  const text = textLines.filter((l) => l !== null).join("\n");

  return { subject, html, text };
}
