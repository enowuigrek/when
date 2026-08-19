import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

/**
 * What a service costs and how long it takes when a given person performs it.
 *
 * The person's own price, or the service's base. Staff groups used to sit
 * between the two — make a "Premium" group, add someone, price the service in
 * it — and they were withdrawn: the only thing they ever carried was a price,
 * and a price belongs to the person charging it. The tables are still in the
 * database in case that is revisited, but nothing reads them; an override
 * nobody can see or edit is worse than no override at all.
 */
export async function resolveEffectivePricing(
  serviceId: string,
  staffId: string | null
): Promise<{ price_pln: number; duration_min: number } | null> {
  const tenantId = await getAdminTenantId();
  return resolveEffectivePricingForTenant(serviceId, staffId, tenantId);
}

export async function resolveEffectivePricingForTenant(
  serviceId: string,
  staffId: string | null,
  tenantId: string
): Promise<{ price_pln: number; duration_min: number } | null> {
  const supabase = createAdminClient();
  const { data: service } = await supabase
    .from("services")
    .select("price_pln, duration_min")
    .eq("tenant_id", tenantId)
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return null;

  const base = {
    price_pln: service.price_pln as number,
    duration_min: service.duration_min as number,
  };
  if (!staffId) return base;

  const { data: own } = await supabase
    .from("staff_services")
    .select("price_pln, duration_min")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId)
    .eq("service_id", serviceId)
    .maybeSingle<{ price_pln: number | null; duration_min: number | null }>();

  if (own && (own.price_pln !== null || own.duration_min !== null)) {
    return {
      price_pln: own.price_pln ?? base.price_pln,
      duration_min: own.duration_min ?? base.duration_min,
    };
  }
  return base;
}
