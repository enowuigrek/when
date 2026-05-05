import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

export type BookingEventType = "created" | "rescheduled" | "cancelled" | "confirmed" | "payment_confirmed";
export type BookingEventSource = "customer" | "admin" | "system";

export type BookingEvent = {
  id: string;
  booking_id: string | null;
  event_type: BookingEventType;
  source: BookingEventSource;
  customer_name: string;
  service_name: string | null;
  starts_at: string;
  created_at: string;
};

export async function recordBookingEvent(input: {
  bookingId: string;
  eventType: BookingEventType;
  source: BookingEventSource;
  customerName: string;
  serviceName: string | null;
  startsAtIso: string;
  /** Override tenant (for system/webhook contexts without admin session). */
  tenantId?: string;
}): Promise<void> {
  const tenantId = input.tenantId ?? (await getAdminTenantId());
  const { error } = await createAdminClient().from("booking_events").insert({
    tenant_id: tenantId,
    booking_id: input.bookingId,
    event_type: input.eventType,
    source: input.source,
    customer_name: input.customerName,
    service_name: input.serviceName,
    starts_at: input.startsAtIso,
  });
  if (error) {
    console.error("[booking-events] insert failed:", error.message);
  }
}

export async function getRecentBookingEvents(limit = 30, sinceHours = 48, sinceIso?: string): Promise<BookingEvent[]> {
  const tenantId = await getAdminTenantId();
  const since = sinceIso ?? new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await createAdminClient()
    .from("booking_events")
    .select("*")
    .eq("tenant_id", tenantId)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[booking-events] fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as BookingEvent[];
}
