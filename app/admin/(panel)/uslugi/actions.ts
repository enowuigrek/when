"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";

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
});

export type ServiceFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

function parseForm(formData: FormData) {
  const raw = {
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    duration_min: formData.get("duration_min")?.toString() ?? "",
    price_pln: formData.get("price_pln")?.toString() ?? "",
    sort_order: formData.get("sort_order")?.toString() ?? "0",
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

  const supabase = createAdminClient();
  const { error } = await supabase.from("services").insert({
    slug,
    name: parsed.data.name,
    description: parsed.data.description || null,
    duration_min: parsed.data.duration_min,
    price_pln: parsed.data.price_pln,
    sort_order: parsed.data.sort_order,
    active: true,
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

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      duration_min: parsed.data.duration_min,
      price_pln: parsed.data.price_pln,
      sort_order: parsed.data.sort_order,
    })
    .eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/uslugi");
  revalidatePath("/");
  revalidatePath("/rezerwacja");
  redirect("/admin/uslugi");
}

export async function toggleServiceActiveAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  const active = formData.get("active") === "true";
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("services").update({ active: !active }).eq("id", id);

  revalidatePath("/admin/uslugi");
  revalidatePath("/");
  revalidatePath("/rezerwacja");
}
