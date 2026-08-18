"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Imię i nazwisko jest wymagane").max(120),
  phone: z.string().trim().min(6, "Numer telefonu wymagany").max(30),
  email: z.string().trim().email("Niepoprawny email").optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
});

export type CreateCustomerState =
  | { status: "idle" }
  | { status: "ok"; id: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function createCustomerAction(
  _prev: CreateCustomerState,
  formData: FormData
): Promise<CreateCustomerState> {
  await requireAdmin();

  const parsed = createSchema.safeParse({
    name: formData.get("name")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź dane.", fieldErrors };
  }

  const supabase = createAdminClient();

  // Phone is unique — fail-friendly check
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", parsed.data.phone)
    .maybeSingle();
  if (existing) {
    return {
      status: "error",
      message: "Klient z tym numerem już istnieje.",
      fieldErrors: { phone: "Ten numer jest już w bazie" },
    };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { status: "error", message: `Błąd: ${error.message}` };

  revalidatePath("/admin/klienci");
  return { status: "ok", id: data.id };
}

export async function deleteCustomerAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;

  const supabase = createAdminClient();
  // Detach historical bookings — set customer_phone unchanged but customers row removed.
  // Bookings reference customer_phone (text), not customers.id, so deleting the customer is safe.
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(`Nie udało się usunąć: ${error.message}`);

  revalidatePath("/admin/klienci");
  redirect("/admin/klienci");
}

export type UpdateContactState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string };

export async function updateCustomerContactAction(
  _prev: UpdateContactState,
  formData: FormData
): Promise<UpdateContactState> {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return { status: "error", message: "Brak ID" };

  const phone = formData.get("phone")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";

  if (phone.length < 6) return { status: "error", message: "Numer telefonu za krótki" };

  const supabase = createAdminClient();

  // Check uniqueness only if phone changed
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .neq("id", id)
    .maybeSingle();
  if (existing) return { status: "error", message: "Ten numer jest już przypisany do innego klienta" };

  const { error } = await supabase
    .from("customers")
    .update({
      phone,
      email: email || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { status: "error", message: `Błąd: ${error.message}` };

  revalidatePath(`/admin/klienci/${id}`);
  return { status: "ok" };
}

export async function updateCustomerNotesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  const notes = formData.get("notes")?.toString() ?? "";
  if (!id) return;
  await createAdminClient()
    .from("customers")
    .update({ notes: notes || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/admin/klienci/${id}`);
}
