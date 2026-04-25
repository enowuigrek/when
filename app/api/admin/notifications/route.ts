import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await createAdminClient()
    .from("bookings")
    .select("id, customer_name, created_at, starts_at, service:services(name)")
    .eq("status", "confirmed")
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(30);

  return NextResponse.json({ bookings: data ?? [] });
}
