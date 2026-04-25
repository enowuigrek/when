import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { data } = await supabase.from("staff").select("*").eq("active", true).order("sort_order");
  return (data ?? []) as Staff[];
}

export async function getAllStaff(): Promise<Staff[]> {
  const { data } = await createAdminClient().from("staff").select("*").order("sort_order");
  return (data ?? []) as Staff[];
}

export async function getStaffById(id: string): Promise<Staff | null> {
  const { data } = await createAdminClient().from("staff").select("*").eq("id", id).maybeSingle();
  return data as Staff | null;
}

export async function createStaff(input: {
  name: string;
  bio: string | null;
  color: string;
  sort_order: number;
}): Promise<void> {
  const { error } = await createAdminClient().from("staff").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateStaff(
  id: string,
  input: { name: string; bio: string | null; color: string; sort_order: number }
): Promise<void> {
  const { error } = await createAdminClient().from("staff").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleStaffActive(id: string, active: boolean): Promise<void> {
  await createAdminClient().from("staff").update({ active: !active }).eq("id", id);
}

export async function deleteStaff(id: string): Promise<void> {
  await createAdminClient().from("staff").delete().eq("id", id);
}

export async function getStaffServiceIds(staffId: string): Promise<string[]> {
  const { data } = await createAdminClient()
    .from("staff_services")
    .select("service_id")
    .eq("staff_id", staffId);
  return (data ?? []).map((r: { service_id: string }) => r.service_id);
}

export async function setStaffServices(staffId: string, serviceIds: string[]): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("staff_services").delete().eq("staff_id", staffId);
  if (serviceIds.length > 0) {
    await supabase.from("staff_services").insert(
      serviceIds.map((sid) => ({ staff_id: staffId, service_id: sid }))
    );
  }
}
