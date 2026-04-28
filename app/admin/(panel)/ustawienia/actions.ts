"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

// ── Settings ─────────────────────────────────────────────────────────────────

const urlOptional = z.string().trim().url("Niepoprawny URL").optional().or(z.literal("").transform(() => undefined));

const settingsSchema = z.object({
  business_name: z.string().trim().min(1, "Nazwa jest wymagana").max(120),
  tagline: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
  description: z.string().trim().max(1000).optional().or(z.literal("").transform(() => undefined)),
  address_street: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
  address_city: z.string().trim().max(100).optional().or(z.literal("").transform(() => undefined)),
  address_postal: z.string().trim().max(20).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(30).optional().or(z.literal("").transform(() => undefined)),
  email: z.string().trim().email("Niepoprawny email").optional().or(z.literal("").transform(() => undefined)),
  instagram_url: urlOptional,
  facebook_url: urlOptional,
  website_url: urlOptional,
  maps_url: urlOptional,
  color_accent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Niepoprawny kolor").default("#d4a26a"),
  theme: z.enum(["dark", "light", "system"]).default("system"),
  slot_granularity_min: z.coerce.number().int().refine(v => [5,10,15,20,30].includes(v), "Niedozwolona wartość"),
  booking_horizon_days: z.coerce.number().int().min(1).max(90),
});

export type SettingsFormState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function updateSettingsAction(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireAdmin();

  const raw = Object.fromEntries(
    [
      "business_name","tagline","description","address_street","address_city",
      "address_postal","phone","email","instagram_url","facebook_url","website_url",
      "maps_url","color_accent","theme","slot_granularity_min","booking_horizon_days",
    ].map((k) => [k, formData.get(k)?.toString() ?? ""])
  );

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź dane w formularzu.", fieldErrors };
  }

  const tenantId = await getAdminTenantId();
  const { error } = await createAdminClient()
    .from("settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);

  if (error) return { status: "error", message: `Błąd zapisu: ${error.message}` };

  revalidatePath("/", "layout");
  return { status: "ok" };
}

// ── Business hours ────────────────────────────────────────────────────────────

export type HoursFormState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string };

export async function updateBusinessHoursAction(
  _prev: HoursFormState,
  formData: FormData
): Promise<HoursFormState> {
  await requireAdmin();

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  for (const dow of [0, 1, 2, 3, 4, 5, 6]) {
    const closed = formData.get(`closed_${dow}`) === "1";
    const open_time = formData.get(`open_${dow}`)?.toString() || null;
    const close_time = formData.get(`close_${dow}`)?.toString() || null;

    const { error } = await supabase.from("business_hours").upsert({
      tenant_id: tenantId,
      day_of_week: dow,
      closed,
      open_time: closed ? null : open_time,
      close_time: closed ? null : close_time,
    }, { onConflict: "tenant_id,day_of_week" });

    if (error) return { status: "error", message: `Błąd zapisu: ${error.message}` };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/ustawienia");
  return { status: "ok" };
}

// ── Time filters ──────────────────────────────────────────────────────────────

const filterSchema = z.object({
  label: z.string().trim().min(1, "Nazwa jest wymagana").max(60),
  from_hour: z.coerce.number().int().min(0).max(23),
  to_hour: z.coerce.number().int().min(1).max(24),
  sort_order: z.coerce.number().int().min(0),
});

export type FilterFormState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function createFilterAction(
  _prev: FilterFormState,
  formData: FormData
): Promise<FilterFormState> {
  await requireAdmin();

  const raw = {
    label: formData.get("label")?.toString() ?? "",
    from_hour: formData.get("from_hour")?.toString() ?? "",
    to_hour: formData.get("to_hour")?.toString() ?? "",
    sort_order: formData.get("sort_order")?.toString() ?? "0",
  };

  const parsed = filterSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź dane.", fieldErrors };
  }

  if (parsed.data.to_hour <= parsed.data.from_hour) {
    return { status: "error", message: "Godzina końcowa musi być późniejsza niż startowa.", fieldErrors: { to_hour: "Musi być późniejsza niż od" } };
  }

  const tenantId = await getAdminTenantId();
  const { error } = await createAdminClient().from("time_filters").insert({ ...parsed.data, tenant_id: tenantId });
  if (error) return { status: "error", message: `Błąd zapisu: ${error.message}` };

  revalidatePath("/admin/ustawienia");
  return { status: "ok" };
}

export async function updateFilterAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id")?.toString();
  if (!id) throw new Error("Missing filter id");

  const raw = {
    label: formData.get("label")?.toString() ?? "",
    from_hour: formData.get("from_hour")?.toString() ?? "",
    to_hour: formData.get("to_hour")?.toString() ?? "",
    sort_order: formData.get("sort_order")?.toString() ?? "0",
  };

  const parsed = filterSchema.safeParse(raw);
  if (!parsed.success) return;

  const tenantId = await getAdminTenantId();
  await createAdminClient().from("time_filters").update(parsed.data).eq("tenant_id", tenantId).eq("id", id);
  revalidatePath("/admin/ustawienia");
}

export async function toggleFilterActiveAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id")?.toString();
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Missing filter id");

  const tenantId = await getAdminTenantId();
  await createAdminClient().from("time_filters").update({ active: !active }).eq("tenant_id", tenantId).eq("id", id);
  revalidatePath("/admin/ustawienia");
}

export async function deleteFilterAction(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id")?.toString();
  if (!id) throw new Error("Missing filter id");

  const tenantId = await getAdminTenantId();
  await createAdminClient().from("time_filters").delete().eq("tenant_id", tenantId).eq("id", id);
  revalidatePath("/admin/ustawienia");
}
