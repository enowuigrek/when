"use server";

import { isSessionSuperAdmin } from "@/lib/auth/super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type NotesState = { error?: string; saved?: boolean };

export async function saveTenantNotesAction(
  _prev: NotesState,
  formData: FormData
): Promise<NotesState> {
  if (!(await isSessionSuperAdmin())) return { error: "Brak uprawnień." };

  const tenantId = formData.get("tenantId")?.toString() ?? "";
  const notes = formData.get("notes")?.toString() ?? "";

  const { error } = await createAdminClient()
    .from("tenants")
    .update({ notes })
    .eq("id", tenantId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/wszystko/${tenantId}`);
  return { saved: true };
}

export async function updateFeedbackStatusAction(formData: FormData) {
  if (!(await isSessionSuperAdmin())) return;

  const feedbackId = formData.get("feedbackId")?.toString() ?? "";
  const status = formData.get("status")?.toString() ?? "";
  const adminReply = formData.get("adminReply")?.toString() || null;

  await createAdminClient()
    .from("feedback")
    .update({ status, admin_reply: adminReply, updated_at: new Date().toISOString() })
    .eq("id", feedbackId);

  revalidatePath("/admin/wszystko/opinie");
}
