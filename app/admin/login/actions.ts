"use server";

import { redirect } from "next/navigation";
import { createAdminSession, verifyPassword } from "@/lib/auth/admin-session";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get("password")?.toString() ?? "";
  if (!verifyPassword(password)) {
    return { error: "Nieprawidłowe hasło." };
  }
  await createAdminSession();
  redirect("/admin");
}
