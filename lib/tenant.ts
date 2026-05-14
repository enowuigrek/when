import "server-only";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";
import { getSessionTenantId } from "./auth/admin-session";

/**
 * Tenant that owns the public marketing site at whenbooking.pl/* and
 * non-subdomain routes (/rezerwacja, /godziny, /kontakt). Set via env var
 * so different deployments (prod, preview, local) can target different
 * tenants without code changes. Falls back to the production tenant id
 * if unset.
 */
export const MAIN_TENANT_ID =
  process.env.MAIN_TENANT_ID ?? "2624f888-8b6b-49cf-a3ff-5eecc77b5236";
const DEMO_COOKIE = "when_demo";
const DEMO_MAX_AGE_S = 60 * 60 * 24; // 24h, matches demo expires_at

/**
 * Resolves a demo tenant id from a slug supplied via URL (`/demo/{slug}`).
 * Validates against the DB so stale or guessed slugs can't impersonate an
 * existing real tenant. Returns null when the tenant doesn't exist, isn't
 * a demo, or has expired.
 */
export async function getDemoTenantIdBySlug(slug: string): Promise<string | null> {
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return null;
  const { data } = await createAdminClient()
    .from("tenants")
    .select("id, expires_at, kind")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.kind !== "demo") return null;
  if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) return null;
  return data.id as string;
}

/**
 * @deprecated Cookie-based demos are being phased out — use URL-based
 * `/demo/{slug}` paths instead. Kept temporarily so any pages that import
 * it don't break; safe to remove once all references are gone.
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

/**
 * Tenant for admin panel.
 * Priority:
 *   1. URL-based demo (`x-demo-slug` header set by proxy for /demo/{slug}/...)
 *   2. Real admin session cookie
 *   3. MAIN_TENANT_ID fallback
 * Cookie-based demos are no longer accepted here — they would let a stale
 * cookie hijack a real `/admin` visit.
 */
export async function getAdminTenantId(): Promise<string> {
  const h = await headers();
  const demoSlug = h.get("x-demo-slug");
  if (demoSlug) {
    const id = await getDemoTenantIdBySlug(demoSlug);
    if (id) return id;
  }
  const session = await getSessionTenantId();
  if (session) return session;
  return MAIN_TENANT_ID;
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

/** Returns the slug of the current admin tenant (used for widget snippet). */
export async function getAdminTenantSlug(): Promise<string> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle();
  return (data?.slug as string | undefined) ?? "main";
}

export async function getAdminTenantKind(): Promise<"main" | "demo" | "customer"> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("tenants")
    .select("kind")
    .eq("id", tenantId)
    .maybeSingle();
  return (data?.kind as "main" | "demo" | "customer" | undefined) ?? "main";
}

export async function clearDemoCookie() {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
}
