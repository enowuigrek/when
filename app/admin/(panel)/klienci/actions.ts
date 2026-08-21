"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePanelAccess } from "@/lib/auth/panel-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId, getAdminBasePath } from "@/lib/tenant";

async function requireAdmin() {
  await requirePanelAccess();
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

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  // Phone is unique per tenant — fail-friendly check
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("tenant_id", tenantId)
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
      tenant_id: tenantId,
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

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();
  // Detach historical bookings — set customer_phone unchanged but customers row removed.
  // Bookings reference customer_phone (text), not customers.id, so deleting the customer is safe.
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(`Nie udało się usunąć: ${error.message}`);

  revalidatePath("/admin/klienci");
  redirect(`${await getAdminBasePath()}/klienci`);
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

  const name = formData.get("name")?.toString().trim() ?? "";
  const phone = formData.get("phone")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";

  if (name.length < 2) return { status: "error", message: "Podaj imię i nazwisko" };
  if (phone.length < 6) return { status: "error", message: "Numer telefonu za krótki" };

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  // Check uniqueness only if phone changed
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .neq("id", id)
    .maybeSingle();
  if (existing) return { status: "error", message: "Ten numer jest już przypisany do innego klienta" };

  // Bookings carry the customer's name and phone as plain columns and are
  // matched back to the profile by phone. So an edit here has to reach them
  // too: without it a corrected surname stays wrong everywhere it is actually
  // read — the schedule, the day card, the confirmation mail — and a corrected
  // phone number silently detaches the whole visit history from the profile.
  const { data: before } = await supabase
    .from("customers")
    .select("name, phone")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone,
      email: email || null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) return { status: "error", message: `Błąd: ${error.message}` };

  if (before && (before.name !== name || before.phone !== phone)) {
    const { error: bookingsError } = await supabase
      .from("bookings")
      .update({ customer_name: name, customer_phone: phone })
      .eq("tenant_id", tenantId)
      .eq("customer_phone", before.phone);
    // The contact itself is saved; say so rather than pretending the whole
    // edit failed, but do not claim the bookings were rewritten.
    if (bookingsError) {
      return {
        status: "error",
        message: "Kontakt zapisany, ale nie udało się poprawić rezerwacji tego klienta.",
      };
    }
    revalidatePath("/admin/harmonogram");
    revalidatePath("/admin/grafik");
  }

  revalidatePath("/admin/klienci");
  revalidatePath(`/admin/klienci/${id}`);
  return { status: "ok" };
}

export async function updateCustomerNotesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  const notes = formData.get("notes")?.toString() ?? "";
  if (!id) return;
  const tenantId = await getAdminTenantId();
  await createAdminClient()
    .from("customers")
    .update({ notes: notes || null, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  revalidatePath(`/admin/klienci/${id}`);
}
