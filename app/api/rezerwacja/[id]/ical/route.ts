import { NextResponse } from "next/server";
import { getBookingById } from "@/lib/db/bookings";
import { getSettings } from "@/lib/db/settings";

type Params = Promise<{ id: string }>;

function fmtIcal(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [booking, s] = await Promise.all([getBookingById(id), getSettings()]);
  if (!booking || booking.status !== "confirmed") {
    return new NextResponse("Not found", { status: 404 });
  }

  const service = (booking as { service?: { name: string } }).service;
  const title = service ? `${service.name} — ${s.business_name}` : s.business_name;
  const location = [s.address_street, s.address_postal, s.address_city]
    .filter(Boolean)
    .join(", ");

  const uid = `booking-${booking.id}@when`;
  const now = fmtIcal(new Date().toISOString());
  const dtstart = fmtIcal(booking.starts_at);
  const dtend = fmtIcal(booking.ends_at);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//when?//booking//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escape(title)}`,
    location ? `LOCATION:${escape(location)}` : "",
    `DESCRIPTION:Nr rezerwacji: ${booking.id.slice(0, 8).toUpperCase()}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="rezerwacja-${booking.id.slice(0, 8)}.ics"`,
    },
  });
}
