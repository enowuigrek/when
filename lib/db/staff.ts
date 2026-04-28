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
  color: string;
  sort_order: number;
}): Promise<void> {
  const tenantId = await getAdminTenantId();
  const { error } = await createAdminClient().from("staff").insert({ ...input, tenant_id: tenantId });
  if (error) throw new Error(error.message);
}

export async function updateStaff(
  id: string,
  input: { name: string; bio: string | null; color: string; sort_order: number }
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

export async function setStaffServices(staffId: string, serviceIds: string[]): Promise<void> {
  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  await supabase.from("staff_services").delete().eq("tenant_id", tenantId).eq("staff_id", staffId);
  if (serviceIds.length > 0) {
    await supabase.from("staff_services").insert(
      serviceIds.map((sid) => ({ staff_id: staffId, service_id: sid, tenant_id: tenantId }))
    );
  }
}
