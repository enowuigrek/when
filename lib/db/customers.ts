import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Customer = {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function searchCustomersByPhone(query: string): Promise<Customer[]> {
  if (query.length < 3) return [];
  const { data } = await createAdminClient()
    .from("customers")
    .select("*")
    .ilike("phone", `%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(6);
  return (data ?? []) as Customer[];
}

export async function upsertCustomer(data: {
  phone: string;
  name: string;
  email: string | null;
}): Promise<string> {
  const { data: result, error } = await createAdminClient()
    .from("customers")
    .upsert(
      { phone: data.phone, name: data.name, email: data.email, updated_at: new Date().toISOString() },
      { onConflict: "phone" }
    )
    .select("id")
    .single();
  if (error) throw new Error(`upsertCustomer: ${error.message}`);
  return result.id;
}

export async function getAllCustomers(): Promise<Customer[]> {
  const { data } = await createAdminClient()
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []) as Customer[];
}
