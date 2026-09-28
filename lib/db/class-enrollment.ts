import "server-only";
import { createBookingForTenant } from "@/lib/db/for-tenant";
import { ensurePackageForTenant } from "@/lib/db/packages";
import { upsertCustomerForTenant } from "@/lib/db/customers";
import {
  getSeatCountsForTenant,
  seatsKey,
  type ClassGroupWithService,
} from "@/lib/db/class-groups";
import { nextMeetings } from "@/lib/class-groups";

export type EnrollMode = "karnet" | "probne";

export type EnrollInput = {
  group: ClassGroupWithService;
  tenantId: string;
  mode: EnrollMode;
  childName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  /** Where to start counting meetings from. Defaults to today. */
  from?: string;
};

export type EnrollResult =
  | { ok: true; bookingIds: string[]; dates: string[] }
  | { ok: false; message: string };

/**
 * Put a child into a recurring group.
 *
 * Shared by the parent's sign-up and the owner adding someone by hand, because
 * they are the same act: a month of classes is one decision and four
 * appointments, and the two paths must not drift into producing different
 * bookkeeping for it.
 */
export async function enrollInGroup(input: EnrollInput): Promise<EnrollResult> {
  const { group, tenantId, mode } = input;
  const service = group.service;
  const lessons = service.total_lessons ?? 1;
  const count = mode === "karnet" ? lessons : 1;
  const meetings = nextMeetings(group, count, input.from);

  // Capacity is checked across every meeting being taken, not just the first:
  // a group that fills up in week three should not swallow a month that runs
  // into it and leave the problem to be discovered later.
  if (group.max_participants != null) {
    const seats = await getSeatCountsForTenant(
      [group.id],
      meetings[0].startsAtIso,
      meetings[meetings.length - 1].endsAtIso,
      tenantId
    );
    const full = meetings.find(
      (m) => (seats.get(seatsKey(group.id, m.date)) ?? 0) >= group.max_participants!
    );
    if (full) {
      return {
        ok: false,
        message:
          meetings.length > 1
            ? "W tej grupie zabrakło miejsc na jedno ze spotkań."
            : "W tej grupie nie ma już wolnych miejsc.",
      };
    }
  }

  const email = input.email?.trim() || null;
  const firstNotes =
    [mode === "probne" ? "Zajęcia próbne" : null, input.notes?.trim() || null]
      .filter(Boolean)
      .join(" · ") || null;

  // The person who attends is the client. Matched on name and number
  // together, so a sibling on the same phone is a second child rather than a
  // rename of the first.
  let attendeeId: string | null = null;
  try {
    attendeeId = await upsertCustomerForTenant(
      { phone: input.phone, name: input.childName, email },
      tenantId
    );
  } catch (e) {
    // The sign-up is the thing the parent is waiting on; the address book
    // catching up can fail without taking it down.
    console.error("[zapisy] could not record the client:", e);
  }

  // A trial is a single visit, not a month — it opens no package, so nothing
  // is counted against a karnet nobody bought.
  const packageId =
    mode === "karnet" && service.total_lessons && attendeeId
      ? await ensurePackageForTenant({
          serviceId: service.id,
          customerId: attendeeId,
          totalLessons: service.total_lessons,
          tenantId,
        })
      : null;

  const bookingIds: string[] = [];
  const dates: string[] = [];
  for (const [i, m] of meetings.entries()) {
    const result = await createBookingForTenant(
      {
        serviceId: service.id,
        customerName: input.childName,
        customerPhone: input.phone,
        customerEmail: email,
        startsAtIso: m.startsAtIso,
        endsAtIso: m.endsAtIso,
        notes: i === 0 ? firstNotes : null,
        staffId: null,
        classGroupId: group.id,
        packageId,
        // The month is paid once. Repeating its price on all four meetings
        // would quadruple the revenue figure for a single karnet.
        pricePlnSnapshot: mode === "karnet" && i === 0 ? service.price_pln : 0,
        durationMinSnapshot: service.duration_min,
      },
      tenantId
    );
    if (!result.ok) {
      // Nothing booked at all is worth reporting and retrying. A later meeting
      // failing still leaves a usable enrolment, so it is logged rather than
      // rolled back — the owner can add the missing week by hand.
      if (i === 0) return { ok: false, message: `Nie udało się zapisać: ${result.message}` };
      console.error("[zapisy] a later meeting could not be booked:", result.message);
      break;
    }
    bookingIds.push(result.id);
    dates.push(m.date);
  }

  return { ok: true, bookingIds, dates };
}
