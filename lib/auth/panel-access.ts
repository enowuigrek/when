import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isAdminAuthenticated } from "./admin-session";
import { getDemoTenantIdBySlug } from "@/lib/tenant";

/**
 * Guard for panel mutations, replacing a bare `isAdminAuthenticated()` check.
 *
 * A demo or trial panel has no session — the URL itself is the credential.
 * Server Actions dispatched from `/demo/{slug}/…` POST back to that same URL,
 * so the proxy rewrite runs and `x-demo-slug` is present on the action
 * request; `getAdminTenantId()` then scopes every read and write to that
 * tenant. Demanding a session here bounced demo visitors to the login screen
 * on any click that changed something, which made the panel look broken to
 * exactly the prospects it is meant to convince.
 *
 * Not for super-admin actions: those must keep requiring a real session.
 */
export async function requirePanelAccess(): Promise<void> {
  if (await isAdminAuthenticated()) return;

  const demoSlug = (await headers()).get("x-demo-slug");
  if (demoSlug && (await getDemoTenantIdBySlug(demoSlug))) return;

  redirect("/admin/login");
}
