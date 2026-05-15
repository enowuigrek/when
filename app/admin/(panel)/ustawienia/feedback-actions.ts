"use server";

import { isAdminAuthenticated, getSessionTenantId } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";

export type FeedbackState = { error?: string; success?: boolean };

export async function submitFeedbackAction(
  _prev: FeedbackState,
  formData: FormData
): Promise<FeedbackState> {
  if (!(await isAdminAuthenticated())) return { error: "Zaloguj się ponownie." };

  const tenantId = await getSessionTenantId();
  if (!tenantId) return { error: "Brak sesji." };

  const message = formData.get("message")?.toString().trim() ?? "";
  const category = formData.get("category")?.toString() ?? "general";

  if (!message) return { error: "Wpisz wiadomość." };
  if (message.length > 2000) return { error: "Wiadomość może mieć max 2000 znaków." };

  const { error } = await createAdminClient()
    .from("feedback")
    .insert({ tenant_id: tenantId, message, category });

  if (error) return { error: "Nie udało się wysłać. Spróbuj ponownie." };

  return { success: true };
}
