import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOriginalTenantId, getSessionTenantId } from "./admin-session";

/**
 * Super-admin = a tenant flagged `is_super_admin = true` in the DB.
 * Their session can impersonate other tenants via the switcher. When
 * impersonating, the *original* tenantId determines super-admin status,
 * not the currently active one — otherwise impersonating into a non-super
 * tenant would lose the privilege and trap us there.
 */
export async function isSessionSuperAdmin(): Promise<boolean> {
  const original = await getOriginalTenantId();
  const current = await getSessionTenantId();
  const tenantToCheck = original ?? current;
  if (!tenantToCheck) return false;

  const { data } = await createAdminClient()
    .from("tenants")
    .select("is_super_admin")
    .eq("id", tenantToCheck)
    .maybeSingle();
  return Boolean(data?.is_super_admin);
}

export type SwitchableTenant = {
  id: string;
  name: string;
  slug: string;
  kind: "main" | "demo" | "customer";
};

/** Lists all real (non-demo) tenants the super-admin can impersonate. */
export async function listSwitchableTenants(): Promise<SwitchableTenant[]> {
  const { data } = await createAdminClient()
    .from("tenants")
    .select("id, name, slug, kind")
    .neq("kind", "demo")
    .order("name");
  return (data ?? []) as SwitchableTenant[];
}
