"use server";

import { redirect } from "next/navigation";
import {
  createAdminSession,
  getOriginalTenantId,
  getSessionTenantId,
  isAdminAuthenticated,
} from "@/lib/auth/admin-session";
import { isSessionSuperAdmin } from "@/lib/auth/super-admin";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Super-admin switches into another tenant's panel. Preserves the original
 * tenantId in the session so we can return later. Idempotent: re-switching
 * keeps the original identity, doesn't nest.
 */
export async function switchTenantAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  if (!(await isSessionSuperAdmin())) throw new Error("Forbidden");

  const targetId = formData.get("tenantId")?.toString() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(targetId)) throw new Error("Invalid tenant id");

  // Verify target tenant exists and is not a demo (super-admin shouldn't be
  // wandering into demo accounts).
  const { data } = await createAdminClient()
    .from("tenants")
    .select("id, kind")
    .eq("id", targetId)
    .maybeSingle();
  if (!data || data.kind === "demo") throw new Error("Tenant not found");

  const existingOriginal = await getOriginalTenantId();
  const currentSession = await getSessionTenantId();
  const original = existingOriginal ?? currentSession;

  // No-op when switching to the original tenant: drop the impersonation flag.
  if (targetId === original) {
    await createAdminSession(targetId, null);
  } else {
    await createAdminSession(targetId, original);
  }
  redirect("/admin");
}

/** Return from impersonation to the super-admin's own tenant. */
export async function stopImpersonationAction() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const original = await getOriginalTenantId();
  if (!original) redirect("/admin");
  await createAdminSession(original, null);
  redirect("/admin");
}
