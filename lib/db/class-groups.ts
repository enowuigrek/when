import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClassGroup, Service } from "@/lib/types";

export type ClassGroupWithService = ClassGroup & { service: Service };

/**
 * Every group this tenant runs, in the order a week is read.
 *
 * Joined with the service rather than fetched separately: a group without its
 * service has no name, no price and no length, so the pair is the unit every
 * caller wants.
 */
export async function getClassGroupsForTenant(
  tenantId: string,
  opts: { includeInactive?: boolean } = {}
): Promise<ClassGroupWithService[]> {
  let q = createAdminClient()
    .from("class_groups")
    .select("*, service:services(*)")
    .eq("tenant_id", tenantId)
    // Time order within the day, because that is how a timetable is read.
    // sort_order only settles ties between two classes at the same hour.
    .order("day_of_week")
    .order("start_time")
    .order("sort_order");
  if (!opts.includeInactive) q = q.eq("active", true);

  const { data, error } = await q;
  if (error) throw new Error(`Failed to load class groups: ${error.message}`);

  // A group whose service was deactivated is not on offer either. The join
  // still returns it, so the filter lives here rather than in the query.
  return ((data ?? []) as ClassGroupWithService[]).filter(
    (g) => g.service && (opts.includeInactive || g.service.active !== false)
  );
}

/**
 * Every weekly slot of one course, newest offer first.
 *
 * The parent chooses a course, not a Tuesday — so the page is loaded by the
 * service's slug and the days come with it.
 */
export async function getCourseGroupsForTenant(
  serviceSlug: string,
  tenantId: string
): Promise<ClassGroupWithService[]> {
  const { data, error } = await createAdminClient()
    .from("class_groups")
    .select("*, service:services!inner(*)")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .eq("services.slug", serviceSlug)
    .order("day_of_week")
    .order("start_time");
  if (error) throw new Error(`Failed to load course: ${error.message}`);
  return ((data ?? []) as ClassGroupWithService[]).filter(
    (g) => g.service && g.service.active !== false
  );
}

export async function getClassGroupBySlugForTenant(
  slug: string,
  tenantId: string
): Promise<ClassGroupWithService | null> {
  const { data, error } = await createAdminClient()
    .from("class_groups")
    .select("*, service:services(*)")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to load class group: ${error.message}`);
  if (!data || !(data as ClassGroupWithService).service) return null;
  return data as ClassGroupWithService;
}

/**
 * How many children are already down for each meeting, keyed `groupId|date`.
 *
 * Counted from the bookings themselves — there is no seat tally to keep in
 * step with reality, so a cancellation frees the place by existing less.
 */
export async function getSeatCountsForTenant(
  groupIds: string[],
  fromIso: string,
  toIso: string,
  tenantId: string
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (groupIds.length === 0) return out;

  const { data, error } = await createAdminClient()
    .from("bookings")
    .select("class_group_id, starts_at")
    .eq("tenant_id", tenantId)
    .in("class_group_id", groupIds)
    .neq("status", "cancelled")
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso);
  if (error) throw new Error(`Failed to count seats: ${error.message}`);

  const dayInWarsaw = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  for (const row of data ?? []) {
    const key = `${row.class_group_id as string}|${dayInWarsaw.format(
      new Date(row.starts_at as string)
    )}`;
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return out;
}

/**
 * Who is down for each meeting, keyed the same way as the seat counts.
 *
 * The owner's question before a class is not "how many" but "who" — a count
 * is what the parent needs, a register is what the room needs.
 */
export type RosterEntry = { name: string; customerId: string | null };

/**
 * Who is down for each meeting, keyed the same way as the seat counts.
 *
 * Carries the client's id where there is one, so a register is a list of
 * links rather than a list of names — the owner reading "kto przyjdzie"
 * usually wants the profile next.
 */
export async function getGroupRosterForTenant(
  groupIds: string[],
  fromIso: string,
  toIso: string,
  tenantId: string
): Promise<Map<string, RosterEntry[]>> {
  const out = new Map<string, RosterEntry[]>();
  if (groupIds.length === 0) return out;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("class_group_id, starts_at, customer_name, customer_phone")
    .eq("tenant_id", tenantId)
    .in("class_group_id", groupIds)
    .neq("status", "cancelled")
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("customer_name");
  if (error) throw new Error(`Failed to load roster: ${error.message}`);

  const rows = data ?? [];
  // A booking stores the name and number it was made with, not a reference —
  // so the client is found the same way the sign-up files them: by both.
  const byPerson = new Map<string, string>();
  const phones = [...new Set(rows.map((r) => r.customer_phone as string))];
  if (phones.length > 0) {
    const { data: people } = await supabase
      .from("customers")
      .select("id, name, phone")
      .eq("tenant_id", tenantId)
      .in("phone", phones);
    for (const c of people ?? []) {
      byPerson.set(
        `${c.phone as string}|${(c.name as string).trim().toLowerCase()}`,
        c.id as string
      );
    }
  }

  const dayInWarsaw = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  for (const row of rows) {
    const key = `${row.class_group_id as string}|${dayInWarsaw.format(
      new Date(row.starts_at as string)
    )}`;
    const name = row.customer_name as string;
    const list = out.get(key) ?? [];
    list.push({
      name,
      customerId:
        byPerson.get(`${row.customer_phone as string}|${name.trim().toLowerCase()}`) ?? null,
    });
    out.set(key, list);
  }
  return out;
}

export function seatsKey(groupId: string, date: string): string {
  return `${groupId}|${date}`;
}
