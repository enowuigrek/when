import { type NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { getRecentBookingEvents } from "@/lib/db/booking-events";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // cursor-based: client sends ?since={ISO} to fetch only newer events
  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  const events = await getRecentBookingEvents(30, 48, since);
  return NextResponse.json({ events });
}
