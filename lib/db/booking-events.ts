import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

export type BookingEventType = "created" | "rescheduled" | "cancelled" | "confirmed" | "payment_confirmed";
export type BookingEventSource = "customer" | "admin" | "system";
/** What a move changed. A drag can do both at once, so "both" is its own case. */
export type ChangeKind = "time" | "staff" | "both";

export type BookingEvent = {
  id: string;
  booking_id: string | null;
  event_type: BookingEventType;
  source: BookingEventSource;
  customer_name: string;
  service_name: string | null;
  /** Who it moved to — set only when the move changed the staff member. */
  staff_name: string | null;
  /** For a move: what it actually changed. Null on rows written before this. */
  change_kind: ChangeKind | null;
  starts_at: string;
  created_at: string;
};

function mergeChangeKind(existing: ChangeKind | null, incoming: ChangeKind | null | undefined): ChangeKind | null {
  if (!existing) return incoming ?? null;
  if (!incoming || incoming === existing) return existing;
  return "both";
}

export async function recordBookingEvent(input: {
  bookingId: string;
  eventType: BookingEventType;
  source: BookingEventSource;
  customerName: string;
  serviceName: string | null;
  /** Pass only when this event changed who is doing the booking. */
  staffName?: string | null;
  /** For a move: what it changed, so the reader can name it correctly. */
  changeKind?: ChangeKind | null;
  startsAtIso: string;
  /** Override tenant (for system/webhook contexts without admin session). */
  tenantId?: string;
  /**
   * Fold this into an event of the same type on the same booking if one was
   * written within this many minutes, instead of adding another.
   *
   * Dragging a booking around the schedule is one decision made in several
   * goes: nudge it, look at it, nudge it again. Each nudge is a real move and
   * must be saved, but they are not five pieces of news — the owner wants to
   * see where it ended up. The folded row keeps the latest time and moves its
   * timestamp forward, so it resurfaces as unread with the final answer.
   */
  coalesceWithinMinutes?: number;
}): Promise<void> {
  const tenantId = input.tenantId ?? (await getAdminTenantId());
  const supabase = createAdminClient();

  if (input.coalesceWithinMinutes) {
    const since = new Date(Date.now() - input.coalesceWithinMinutes * 60_000).toISOString();
    const { data: recent } = await supabase
      .from("booking_events")
      .select("id, change_kind")
      .eq("tenant_id", tenantId)
      .eq("booking_id", input.bookingId)
      .eq("event_type", input.eventType)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      const { error: updateError } = await supabase
        .from("booking_events")
        .update({
          starts_at: input.startsAtIso,
          // The fold keeps the latest answer, and "moved back to nobody in
          // particular" is an answer too — so this overwrites rather than
          // filling in only when set.
          staff_name: input.staffName ?? null,
          // Kinds accumulate rather than overwrite: nudge the hour, then hand
          // it to someone else, and the one notice left behind has to say both
          // happened — neither half stopped being true.
          change_kind: mergeChangeKind(recent.change_kind as ChangeKind | null, input.changeKind),
          created_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .eq("id", recent.id);
      // A failed fold is not worth losing the event over — fall through and
      // write a new row rather than swallowing the news entirely.
      if (!updateError) return;
    }
  }

  const { error } = await supabase.from("booking_events").insert({
    tenant_id: tenantId,
    booking_id: input.bookingId,
    event_type: input.eventType,
    source: input.source,
    customer_name: input.customerName,
    service_name: input.serviceName,
    staff_name: input.staffName ?? null,
    change_kind: input.changeKind ?? null,
    starts_at: input.startsAtIso,
  });
  if (error) {
    console.error("[booking-events] insert failed:", error.message);
  }
}

export async function getRecentBookingEvents(limit = 30, sinceHours = 48, sinceIso?: string): Promise<BookingEvent[]> {
  return getRecentBookingEventsForTenant(await getAdminTenantId(), limit, sinceHours, sinceIso);
}

/**
 * Same as `getRecentBookingEvents` but for an explicitly resolved tenant.
 *
 * The notification bell polls from the browser, and that request never passes
 * through the `/demo/{slug}` rewrite — so `x-demo-slug` is absent and
 * `getAdminTenantId()` would silently fall back to MAIN_TENANT_ID. Callers
 * serving a demo/trial panel must resolve the tenant themselves (validating
 * the slug) and pass it here.
 */
export async function getRecentBookingEventsForTenant(
  tenantId: string,
  limit = 30,
  sinceHours = 48,
  sinceIso?: string
): Promise<BookingEvent[]> {
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
