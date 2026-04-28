import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

export type StaffGroup = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type StaffGroupWithMembers = StaffGroup & {
  member_ids: string[];
};

export type ServiceGroupPrice = {
  service_id: string;
  group_id: string;
  price_pln: number;
  duration_min: number | null;
};

export async function getStaffGroups(): Promise<StaffGroup[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("staff_groups")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order");
  return (data ?? []) as StaffGroup[];
}

export async function getStaffGroupsWithMembers(): Promise<StaffGroupWithMembers[]> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const [groupsRes, membersRes] = await Promise.all([
    supabase.from("staff_groups").select("*").eq("tenant_id", tenantId).order("sort_order"),
    supabase.from("staff_group_members").select("*").eq("tenant_id", tenantId),
  ]);
  const members = (membersRes.data ?? []) as { staff_id: string; group_id: string }[];
  return ((groupsRes.data ?? []) as StaffGroup[]).map((g) => ({
    ...g,
    member_ids: members.filter((m) => m.group_id === g.id).map((m) => m.staff_id),
  }));
}

export async function createStaffGroup(name: string): Promise<void> {
  const tenantId = await getAdminTenantId();
  const { error } = await createAdminClient().from("staff_groups").insert({ name, tenant_id: tenantId });
  if (error) throw new Error(error.message);
}

export async function renameStaffGroup(id: string, name: string): Promise<void> {
  const tenantId = await getAdminTenantId();
  await createAdminClient().from("staff_groups").update({ name }).eq("tenant_id", tenantId).eq("id", id);
}

export async function deleteStaffGroup(id: string): Promise<void> {
  const tenantId = await getAdminTenantId();
  await createAdminClient().from("staff_groups").delete().eq("tenant_id", tenantId).eq("id", id);
}

export async function setGroupMembers(groupId: string, staffIds: string[]): Promise<void> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  await supabase.from("staff_group_members").delete().eq("tenant_id", tenantId).eq("group_id", groupId);
  if (staffIds.length > 0) {
    await supabase.from("staff_group_members").insert(
      staffIds.map((sid) => ({ group_id: groupId, staff_id: sid, tenant_id: tenantId }))
    );
  }
}

export async function getServiceGroupPrices(serviceId: string): Promise<ServiceGroupPrice[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("service_group_prices")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId);
  return (data ?? []) as ServiceGroupPrice[];
}

export async function setServiceGroupPrice(input: ServiceGroupPrice): Promise<void> {
  const tenantId = await getAdminTenantId();
  await createAdminClient()
    .from("service_group_prices")
    .upsert({ ...input, tenant_id: tenantId }, { onConflict: "service_id,group_id" });
}

export async function deleteServiceGroupPrice(serviceId: string, groupId: string): Promise<void> {
  const tenantId = await getAdminTenantId();
  await createAdminClient()
    .from("service_group_prices")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .eq("group_id", groupId);
}

/**
 * Resolve effective price+duration for a service when performed by a given staff.
 * If the staff belongs to a group with an override, use it. If multiple, take the
 * highest price (premium wins).
 */
export async function resolveEffectivePricing(
  serviceId: string,
  staffId: string | null
): Promise<{ price_pln: number; duration_min: number } | null> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const { data: service } = await supabase
    .from("services")
    .select("price_pln, duration_min")
    .eq("tenant_id", tenantId)
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return null;

  const base = { price_pln: service.price_pln as number, duration_min: service.duration_min as number };
  if (!staffId) return base;

  const [memRes, priceRes] = await Promise.all([
    supabase.from("staff_group_members").select("group_id").eq("tenant_id", tenantId).eq("staff_id", staffId),
    supabase.from("service_group_prices").select("*").eq("tenant_id", tenantId).eq("service_id", serviceId),
  ]);
  const groupIds = new Set((memRes.data ?? []).map((r) => r.group_id as string));
  const overrides = (priceRes.data ?? []).filter((r) => groupIds.has(r.group_id as string));
  if (overrides.length === 0) return base;

  const best = overrides.reduce((acc, o) =>
    (o.price_pln as number) > acc.price_pln ? { price_pln: o.price_pln as number, duration_min: (o.duration_min as number | null) ?? base.duration_min } : acc,
    base
  );
  return best;
}
