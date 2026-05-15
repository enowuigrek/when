"use server";

import { redirect } from "next/navigation";
import { isSessionSuperAdmin } from "@/lib/auth/super-admin";
import { hashPassword } from "@/lib/auth/password";
import { createAdminClient } from "@/lib/supabase/admin";

export type NewTenantState = { error?: string };

export async function createTenantAction(
  _prev: NewTenantState,
  formData: FormData
): Promise<NewTenantState> {
  if (!(await isSessionSuperAdmin())) return { error: "Brak uprawnień." };

  const name = formData.get("name")?.toString().trim() ?? "";
  const slug = formData.get("slug")?.toString().trim().toLowerCase() ?? "";
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!name || !slug || !email || !password) return { error: "Uzupełnij wszystkie pola." };
  if (!/^[a-z0-9-]+$/.test(slug)) return { error: "Slug może zawierać tylko litery, cyfry i myślniki." };
  if (password.length < 8) return { error: "Hasło musi mieć min. 8 znaków." };

  const passwordHash = await hashPassword(password);

  const { error } = await createAdminClient()
    .from("tenants")
    .insert({ name, slug, email, password_hash: passwordHash, kind: "customer" });

  if (error) {
    if (error.code === "23505") return { error: "Ten email lub slug jest już zajęty." };
    return { error: error.message };
  }

  redirect("/admin/wszystko");
}
