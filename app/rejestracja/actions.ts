"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth/password";
import { createAdminSession } from "@/lib/auth/admin-session";

const schema = z.object({
  business_name: z.string().trim().min(2, "Podaj nazwę firmy").max(120),
  email: z.string().trim().email("Niepoprawny email").toLowerCase(),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków").max(128),
  password2: z.string(),
}).refine((d) => d.password === d.password2, {
  message: "Hasła się nie zgadzają",
  path: ["password2"],
});

export type RegisterState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const raw = {
    business_name: formData.get("business_name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    password2: formData.get("password2")?.toString() ?? "",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź dane.", fieldErrors };
  }

  const supabase = createAdminClient();

  // Check email uniqueness
  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (existing) {
    return {
      status: "error",
      message: "Ten email jest już zajęty.",
      fieldErrors: { email: "Ten email jest już zajęty." },
    };
  }

  // Create tenant
  const slug = `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const passwordHash = await hashPassword(parsed.data.password);

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .insert({
      slug,
      name: parsed.data.business_name,
      kind: "main",
      email: parsed.data.email,
      password_hash: passwordHash,
    })
    .select("id")
    .single();

  if (tenantErr || !tenant) {
    return { status: "error", message: `Błąd tworzenia konta: ${tenantErr?.message ?? "nieznany"}` };
  }

  const tenantId = tenant.id as string;

  // Seed minimal defaults
  await Promise.all([
    // Settings
    supabase.from("settings").insert({
      tenant_id: tenantId,
      business_name: parsed.data.business_name,
      slot_granularity_min: 15,
      booking_horizon_days: 21,
      color_accent: "#d4a26a",
      theme: "dark",
    }),
    // Business hours (Mon–Sat 10–19, Sun closed)
    supabase.from("business_hours").insert([
      { tenant_id: tenantId, day_of_week: 0, open_time: null, close_time: null, closed: true },
      { tenant_id: tenantId, day_of_week: 1, open_time: "10:00", close_time: "19:00", closed: false },
      { tenant_id: tenantId, day_of_week: 2, open_time: "10:00", close_time: "19:00", closed: false },
      { tenant_id: tenantId, day_of_week: 3, open_time: "10:00", close_time: "19:00", closed: false },
      { tenant_id: tenantId, day_of_week: 4, open_time: "10:00", close_time: "19:00", closed: false },
      { tenant_id: tenantId, day_of_week: 5, open_time: "10:00", close_time: "19:00", closed: false },
      { tenant_id: tenantId, day_of_week: 6, open_time: "09:00", close_time: "15:00", closed: false },
    ]),
    // Time filters
    supabase.from("time_filters").insert([
      { tenant_id: tenantId, label: "Rano", from_hour: 6, to_hour: 12, sort_order: 1 },
      { tenant_id: tenantId, label: "Południe", from_hour: 12, to_hour: 15, sort_order: 2 },
      { tenant_id: tenantId, label: "Popołudnie", from_hour: 15, to_hour: 18, sort_order: 3 },
      { tenant_id: tenantId, label: "Wieczór", from_hour: 18, to_hour: 23, sort_order: 4 },
    ]),
  ]);

  await createAdminSession(tenantId);
  redirect("/admin");
}
