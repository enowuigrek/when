import { NextResponse } from "next/server";
import { getBookingByIdPublic, getSettingsForTenant } from "@/lib/db/for-tenant";
import { buildIcsForBooking } from "@/lib/ics";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const booking = await getBookingByIdPublic(id);
  if (!booking || booking.status !== "confirmed") {
    return new NextResponse("Not found", { status: 404 });
  }
  const settings = await getSettingsForTenant(booking.tenant_id);
  const service = (booking as { service?: { name: string } }).service ?? null;

  const ics = buildIcsForBooking({
    booking,
    settings,
    service,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="rezerwacja-${booking.id.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
