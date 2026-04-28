import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "./supabase/admin";

export const MAIN_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_COOKIE = "when_demo";
const DEMO_MAX_AGE_S = 60 * 60 * 24; // 24h, matches demo expires_at

/**
 * Returns the demo tenant id from cookie, if present, valid, and not expired.
 * Reads tenants table to verify — keeps invariant that a stale cookie can't
 * point at a deleted tenant.
 */
export async function getDemoTenantId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(DEMO_COOKIE)?.value;
  if (!raw || !/^[0-9a-f-]{36}$/i.test(raw)) return null;

  const { data } = await createAdminClient()
    .from("tenants")
    .select("id, expires_at, kind")
    .eq("id", raw)
    .maybeSingle();

  if (!data || data.kind !== "demo") return null;
  if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) return null;
  return data.id as string;
}

/** Tenant for admin panel: demo if a valid demo cookie is present, else main. */
export async function getAdminTenantId(): Promise<string> {
  const demo = await getDemoTenantId();
  return demo ?? MAIN_TENANT_ID;
}

/** Resolve a tenant by its public slug (used by public booking pages). */
export async function getTenantIdBySlug(slug: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function setDemoCookie(tenantId: string) {
  const jar = await cookies();
  jar.set(DEMO_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_MAX_AGE_S,
  });
}

export async function clearDemoCookie() {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
}
