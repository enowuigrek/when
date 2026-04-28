"use server";

import { redirect } from "next/navigation";
import { createAdminSession, verifyPassword } from "@/lib/auth/admin-session";
import { verifyPasswordHash } from "@/lib/auth/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAIN_TENANT_ID } from "@/lib/tenant";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!password) return { error: "Podaj hasło." };

  // ── Email provided → look up tenant in DB ────────────────────────────────
  if (email) {
    const { data } = await createAdminClient()
      .from("tenants")
      .select("id, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (!data?.password_hash) {
      return { error: "Nieprawidłowy email lub hasło." };
    }
    const ok = await verifyPasswordHash(password, data.password_hash as string);
    if (!ok) return { error: "Nieprawidłowy email lub hasło." };

    await createAdminSession(data.id as string);
    redirect("/admin");
  }

  // ── No email → legacy ADMIN_PASSWORD mode (main tenant) ──────────────────
  if (!verifyPassword(password)) {
    return { error: "Nieprawidłowe hasło." };
  }
  await createAdminSession(MAIN_TENANT_ID);
  redirect("/admin");
}
