import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

export type Staff = {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  color: string;
  sort_order: number;
  active: boolean;
  email: string | null;
  created_at: string;
};

export async function getActiveStaff(): Promise<Staff[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("staff")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as Staff[];
}

export async function getAllStaff(): Promise<Staff[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("staff")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order");
  return (data ?? []) as Staff[];
}

export async function getStaffById(id: string): Promise<Staff | null> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("staff")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  return data as Staff | null;
}

export async function createStaff(input: {
  name: string;
  bio: string | null;
  email: string | null;
  photo_url: string | null;
  color: string;
  sort_order: number;
}): Promise<void> {
  const tenantId = await getAdminTenantId();
  const { error } = await createAdminClient().from("staff").insert({ ...input, tenant_id: tenantId });
  if (error) throw new Error(error.message);
}

export async function updateStaff(
  id: string,
  input: { name: string; bio: string | null; email: string | null; photo_url: string | null; color: string; sort_order: number }
): Promise<void> {
  const tenantId = await getAdminTenantId();
  const { error } = await createAdminClient()
    .from("staff")
    .update(input)
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleStaffActive(id: string, active: boolean): Promise<void> {
  const tenantId = await getAdminTenantId();
  await createAdminClient()
    .from("staff")
    .update({ active: !active })
    .eq("tenant_id", tenantId)
    .eq("id", id);
}

export async function deleteStaff(id: string): Promise<void> {
  const tenantId = await getAdminTenantId();
  await createAdminClient().from("staff").delete().eq("tenant_id", tenantId).eq("id", id);
}

export async function getStaffServiceIds(staffId: string): Promise<string[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("staff_services")
    .select("service_id")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId);
  return (data ?? []).map((r: { service_id: string }) => r.service_id);
}

/**
 * Set which services a person performs.
 *
 * Adds and removes rather than wiping and re-inserting: the row now also
 * carries that person's price for the service, and a delete-all would throw it
 * away every time someone opened the edit form and pressed save.
 */
export async function setStaffServices(staffId: string, serviceIds: string[]): Promise<void> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("staff_services")
    .select("service_id")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId);
  const current = new Set((data ?? []).map((r: { service_id: string }) => r.service_id));
  const wanted = new Set(serviceIds);

  const toRemove = [...current].filter((id) => !wanted.has(id));
  const toAdd = serviceIds.filter((id) => !current.has(id));

  if (toRemove.length > 0) {
    await supabase
      .from("staff_services")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("staff_id", staffId)
      .in("service_id", toRemove);
  }
  if (toAdd.length > 0) {
    await supabase.from("staff_services").insert(
      toAdd.map((sid) => ({ staff_id: staffId, service_id: sid, tenant_id: tenantId }))
    );
  }
}

export type StaffServicePricing = {
  serviceId: string;
  name: string;
  basePricePln: number;
  baseDurationMin: number;
  /** This person's own price, or null when they charge the base. */
  ownPricePln: number | null;
  active: boolean;
};

/** Services this person performs, with the base price and their own override. */
export async function getStaffServicesWithPricing(staffId: string): Promise<StaffServicePricing[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("staff_services")
    .select("service_id, price_pln, service:services(name, price_pln, duration_min, active, sort_order)")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId);

  type Row = {
    service_id: string;
    price_pln: number | null;
    service: { name: string; price_pln: number; duration_min: number; active: boolean; sort_order: number } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.service)
    .sort((a, b) => (a.service!.sort_order ?? 0) - (b.service!.sort_order ?? 0))
    .map((r) => ({
      serviceId: r.service_id,
      name: r.service!.name,
      basePricePln: r.service!.price_pln,
      baseDurationMin: r.service!.duration_min,
      ownPricePln: r.price_pln,
      active: r.service!.active,
    }));
}

/** Set or clear one person's price for one service. */
export async function setStaffServicePrice(staffId: string, serviceId: string, pricePln: number | null): Promise<void> {
  const tenantId = await getAdminTenantId();
  await createAdminClient()
    .from("staff_services")
    .update({ price_pln: pricePln })
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId)
    .eq("service_id", serviceId);
}

export type StaffBooking = {
  id: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone: string;
  serviceName: string | null;
  pricePln: number | null;
  notes: string | null;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
};

/** Everything booked with this person, newest last. Feeds the profile's tabs. */
export async function getStaffBookings(staffId: string): Promise<StaffBooking[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("bookings")
    .select("id, starts_at, ends_at, customer_name, customer_phone, notes, status, price_pln_snapshot, service:services(name, price_pln)")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId)
    .order("starts_at", { ascending: true });

  type Row = {
    id: string; starts_at: string; ends_at: string; customer_name: string; customer_phone: string;
    notes: string | null; status: StaffBooking["status"]; price_pln_snapshot: number | null;
    service: { name: string; price_pln: number } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((b) => ({
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    serviceName: b.service?.name ?? null,
    pricePln: b.price_pln_snapshot ?? b.service?.price_pln ?? null,
    notes: b.notes,
    status: b.status,
  }));
}
