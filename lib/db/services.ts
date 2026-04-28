import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";
import type { Service, BusinessHours } from "@/lib/types";

export async function getServices(): Promise<Service[]> {
  const tenantId = await getAdminTenantId();
  const { data, error } = await createAdminClient()
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Failed to load services: ${error.message}`);
  return data ?? [];
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const tenantId = await getAdminTenantId();
  const { data, error } = await createAdminClient()
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) throw new Error(`Failed to load service: ${error.message}`);
  return data;
}

export async function getServiceById(id: string): Promise<Service | null> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getBusinessHours(): Promise<BusinessHours[]> {
  const tenantId = await getAdminTenantId();
  const { data, error } = await createAdminClient()
    .from("business_hours")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("day_of_week", { ascending: true });

  if (error) throw new Error(`Failed to load hours: ${error.message}`);
  return data ?? [];
}
