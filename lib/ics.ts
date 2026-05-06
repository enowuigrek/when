type BookingForIcs = {
  id: string;
  starts_at: string;
  ends_at: string;
};

type SettingsForIcs = {
  business_name: string;
  address_street?: string | null;
  address_postal?: string | null;
  address_city?: string | null;
};

type ServiceForIcs = {
  name: string;
};

export function fmtUtc(iso: string): string {
  // Always emit YYYYMMDDTHHMMSSZ in UTC. supabase-js returns timestamptz
  // as ISO with `+00:00` — passing that through string replace would
  // yield `...+0000`, which is invalid iCal and breaks Apple Calendar.
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildIcsForBooking(opts: {
  booking: BookingForIcs;
  settings: SettingsForIcs;
  service?: ServiceForIcs | null;
  siteUrl?: string;
}): string {
  const { booking, settings, service, siteUrl = "" } = opts;
  const title = service
    ? `${service.name} — ${settings.business_name}`
    : settings.business_name;
  const location = [settings.address_street, settings.address_postal, settings.address_city]
    .filter(Boolean)
    .join(", ");

  const uid = `booking-${booking.id}@when`;
  const now = fmtUtc(new Date().toISOString());
  const dtstart = fmtUtc(booking.starts_at);
  const dtend = fmtUtc(booking.ends_at);
  const description = escapeText(
    `Nr rezerwacji: ${booking.id.slice(0, 8).toUpperCase()}\nZarządzaj rezerwacją: ${siteUrl}/rezerwacja/sukces/${booking.id}`
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//when//booking//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeText(title)}`,
    location ? `LOCATION:${escapeText(location)}` : "",
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

