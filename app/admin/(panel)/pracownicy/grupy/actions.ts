"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import {
  createStaffGroup,
  renameStaffGroup,
  deleteStaffGroup,
  setGroupMembers,
} from "@/lib/db/staff-groups";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

export async function createGroupAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = formData.get("name")?.toString().trim();
  if (!name || name.length < 2) return;
  await createStaffGroup(name);
  revalidatePath("/admin/pracownicy/grupy");
}

export async function renameGroupAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString().trim();
  if (!id || !name) return;
  await renameStaffGroup(id, name);
  revalidatePath("/admin/pracownicy/grupy");
}

export async function deleteGroupAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await deleteStaffGroup(id);
  revalidatePath("/admin/pracownicy/grupy");
}

export async function setGroupMembersAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const groupId = formData.get("group_id")?.toString();
  const staffIds = formData.getAll("staff_id").map((v) => v.toString());
  if (!groupId) return;
  await setGroupMembers(groupId, staffIds);
  revalidatePath("/admin/pracownicy/grupy");
}
