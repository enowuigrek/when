"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { getAdminTenantId } from "@/lib/tenant";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

const serviceSchema = z.object({
  name: z.string().trim().min(2, "Podaj nazwę usługi").max(80),
  description: z.string().trim().max(300).optional(),
  duration_min: z.coerce
    .number()
    .int()
    .min(5, "Minimum 5 minut")
    .max(480, "Maksimum 8 godzin"),
  price_pln: z.coerce
    .number()
    .int()
    .min(0, "Cena nie może być ujemna")
    .max(9999),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_group: z.string().optional().transform((v) => v === "true"),
  max_participants: z.coerce
    .number()
    .int()
    .min(1, "Minimum 1 osoba")
    .max(500)
    .optional()
    .nullable(),
  payment_mode: z.enum(["none", "deposit", "full"]).default("none"),
  deposit_amount_pln: z.coerce
    .number()
    .int()
    .min(1, "Minimum 1 zł")
    .max(9999)
    .optional()
    .nullable(),
}).refine(
  (d) => !d.is_group || (d.max_participants != null && d.max_participants >= 1),
  { message: "Podaj limit miejsc dla zajęć grupowych.", path: ["max_participants"] }
).refine(
  (d) => d.payment_mode !== "deposit" || (d.deposit_amount_pln != null && d.deposit_amount_pln >= 1),
  { message: "Podaj kwotę zadatku.", path: ["deposit_amount_pln"] }
);

export type ServiceFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

function parseForm(formData: FormData) {
  const isGroup = formData.get("is_group")?.toString() === "true";
  const paymentMode = formData.get("payment_mode")?.toString() ?? "none";
  const raw = {
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    duration_min: formData.get("duration_min")?.toString() ?? "",
    price_pln: formData.get("price_pln")?.toString() ?? "",
    sort_order: formData.get("sort_order")?.toString() ?? "0",
    is_group: formData.get("is_group")?.toString() ?? "false",
    max_participants: isGroup
      ? (formData.get("max_participants")?.toString() ?? "")
      : null,
    payment_mode: paymentMode,
    deposit_amount_pln:
      paymentMode === "deposit"
        ? (formData.get("deposit_amount_pln")?.toString() ?? "")
        : null,
  };
  return serviceSchema.safeParse(raw);
}

export async function createServiceAction(
  _prev: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź formularz.", fieldErrors };
  }

  const slug = parsed.data.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const { error } = await supabase.from("services").insert({
    tenant_id: tenantId,
    slug,
    name: parsed.data.name,
    description: parsed.data.description || null,
    duration_min: parsed.data.duration_min,
    price_pln: parsed.data.price_pln,
    sort_order: parsed.data.sort_order,
    active: true,
    is_group: parsed.data.is_group,
    max_participants: parsed.data.is_group ? (parsed.data.max_participants ?? null) : null,
    payment_mode: parsed.data.payment_mode,
    deposit_amount_pln: parsed.data.payment_mode === "deposit" ? (parsed.data.deposit_amount_pln ?? null) : null,
  });

  if (error) {
    if (error.code === "23505")
      return { status: "error", message: "Usługa o tej nazwie już istnieje." };
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/uslugi");
  revalidatePath("/");
  revalidatePath("/rezerwacja");
  redirect("/admin/uslugi");
}

export async function updateServiceAction(
  id: string,
  _prev: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź formularz.", fieldErrors };
  }

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      duration_min: parsed.data.duration_min,
      price_pln: parsed.data.price_pln,
      sort_order: parsed.data.sort_order,
      is_group: parsed.data.is_group,
      max_participants: parsed.data.is_group ? (parsed.data.max_participants ?? null) : null,
      payment_mode: parsed.data.payment_mode,
      deposit_amount_pln: parsed.data.payment_mode === "deposit" ? (parsed.data.deposit_amount_pln ?? null) : null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/uslugi");
  revalidatePath("/");
  revalidatePath("/rezerwacja");
  redirect("/admin/uslugi");
}

export async function setServicePriceOverrideAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const serviceId = formData.get("service_id")?.toString();
  const groupId = formData.get("group_id")?.toString();
  const priceRaw = formData.get("price_pln")?.toString();
  const durationRaw = formData.get("duration_min")?.toString().trim();
  if (!serviceId || !groupId) return;

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  // Verify service belongs to current tenant before mutating overrides
  const { data: svc } = await supabase
    .from("services")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", serviceId)
    .maybeSingle();
  if (!svc) return;

  // Empty price → delete override
  if (!priceRaw || priceRaw.trim() === "") {
    await supabase.from("service_group_prices").delete().eq("service_id", serviceId).eq("group_id", groupId);
  } else {
    const price = parseInt(priceRaw, 10);
    if (Number.isNaN(price) || price < 0) return;
    const duration = durationRaw && durationRaw !== "" ? parseInt(durationRaw, 10) : null;
    await supabase
      .from("service_group_prices")
      .upsert({ service_id: serviceId, group_id: groupId, price_pln: price, duration_min: duration }, { onConflict: "service_id,group_id" });
  }

  revalidatePath(`/admin/uslugi/${serviceId}`);
}

export async function toggleServiceActiveAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  const active = formData.get("active") === "true";
  if (!id) return;

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  await supabase.from("services").update({ active: !active }).eq("tenant_id", tenantId).eq("id", id);

  revalidatePath("/admin/uslugi");
  revalidatePath("/");
  revalidatePath("/rezerwacja");
}
