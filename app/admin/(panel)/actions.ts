"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  destroyAdminSession,
  isAdminAuthenticated,
} from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function cancelBookingAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("Invalid booking id");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) throw new Error(`Cancel failed: ${error.message}`);

  revalidatePath("/admin");
  revalidatePath("/admin/tydzien");
}
