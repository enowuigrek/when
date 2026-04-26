import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { getRecentBookingEvents } from "@/lib/db/booking-events";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const events = await getRecentBookingEvents(30, 48);
  return NextResponse.json({ events });
}
