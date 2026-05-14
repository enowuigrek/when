import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { MAIN_TENANT_ID } from "@/lib/tenant";

const COOKIE_NAME = "when_admin";
const MAX_AGE_S = 60 * 60 * 24 * 7; // 7 days

function sign(payload: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET not set");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * Cookie formats (newest first):
 *   "{tenantId}|{expIso}|{originalTenantId}.{hmac(payload)}" — impersonating
 *   "{tenantId}|{expIso}.{hmac(payload)}"                   — normal session
 *   "{expIso}.{hmac(payload)}"                               — legacy (pre-multi-tenant)
 */
type ParsedSession = {
  tenantId: string;
  originalTenantId: string | null;
  valid: boolean;
};

function buildValue(tenantId: string, exp: string, originalTenantId?: string | null): string {
  const payload = originalTenantId
    ? `${tenantId}|${exp}|${originalTenantId}`
    : `${tenantId}|${exp}`;
  return `${payload}.${sign(payload)}`;
}

function parseValue(raw: string): ParsedSession {
  const pipeIdx = raw.indexOf("|");
  const dotIdx = raw.lastIndexOf(".");

  if (pipeIdx < 0) {
    // Legacy: "{expIso}.{hmac}" — treat as MAIN_TENANT_ID, no impersonation
    const exp = raw.slice(0, dotIdx);
    const sig = raw.slice(dotIdx + 1);
    if (!safeEqualHex(sig, sign(exp))) return { tenantId: MAIN_TENANT_ID, originalTenantId: null, valid: false };
    if (new Date(exp).getTime() < Date.now()) return { tenantId: MAIN_TENANT_ID, originalTenantId: null, valid: false };
    return { tenantId: MAIN_TENANT_ID, originalTenantId: null, valid: true };
  }

  const payload = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  if (!safeEqualHex(sig, sign(payload))) {
    return { tenantId: MAIN_TENANT_ID, originalTenantId: null, valid: false };
  }
  const parts = payload.split("|");
  // [tenantId, expIso] or [tenantId, expIso, originalTenantId]
  const tenantId = parts[0];
  const exp = parts[1];
  const originalTenantId = parts[2] ?? null;
  if (!tenantId || !exp) return { tenantId: MAIN_TENANT_ID, originalTenantId: null, valid: false };
  if (new Date(exp).getTime() < Date.now()) {
    return { tenantId: MAIN_TENANT_ID, originalTenantId: null, valid: false };
  }
  return { tenantId, originalTenantId, valid: true };
}

/** Issues a signed session cookie. `originalTenantId` marks impersonation. */
export async function createAdminSession(
  tenantId: string = MAIN_TENANT_ID,
  originalTenantId?: string | null
) {
  const exp = new Date(Date.now() + MAX_AGE_S * 1000).toISOString();
  const value = buildValue(tenantId, exp, originalTenantId ?? null);
  const jar = await cookies();
  jar.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  return parseValue(raw).valid;
}

/** Returns the tenantId encoded in the admin session, or null if not authenticated. */
export async function getSessionTenantId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const { tenantId, valid } = parseValue(raw);
  return valid ? tenantId : null;
}

/**
 * Returns the original tenantId (who actually logged in) when impersonating,
 * or null when this is a regular non-impersonated session.
 */
export async function getOriginalTenantId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const { originalTenantId, valid } = parseValue(raw);
  return valid ? originalTenantId : null;
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (input.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}
