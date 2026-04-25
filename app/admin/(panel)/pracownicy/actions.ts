"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import {
  createStaff,
  updateStaff,
  toggleStaffActive,
  deleteStaff,
  setStaffServices,
} from "@/lib/db/staff";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

const staffSchema = z.object({
  name: z.string().trim().min(1, "Imię jest wymagane").max(80),
  bio: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Niepoprawny kolor"),
  sort_order: z.coerce.number().int().min(0),
});

export type StaffFormState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function createStaffAction(
  _prev: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  await requireAdmin();

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    bio: formData.get("bio")?.toString() ?? "",
    color: formData.get("color")?.toString() ?? "#d4a26a",
    sort_order: formData.get("sort_order")?.toString() ?? "0",
  };

  const parsed = staffSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź dane.", fieldErrors };
  }

  try {
    await createStaff({ ...parsed.data, bio: parsed.data.bio ?? null });
  } catch (e) {
    return { status: "error", message: String(e) };
  }

  revalidatePath("/admin/pracownicy");
  redirect("/admin/pracownicy");
}

export async function updateStaffAction(
  _prev: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  await requireAdmin();

  const id = formData.get("id")?.toString();
  if (!id) return { status: "error", message: "Brak ID." };

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    bio: formData.get("bio")?.toString() ?? "",
    color: formData.get("color")?.toString() ?? "#d4a26a",
    sort_order: formData.get("sort_order")?.toString() ?? "0",
  };

  const parsed = staffSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź dane.", fieldErrors };
  }

  const serviceIds = formData.getAll("serviceIds[]").map(String);

  try {
    await updateStaff(id, { ...parsed.data, bio: parsed.data.bio ?? null });
    await setStaffServices(id, serviceIds);
  } catch (e) {
    return { status: "error", message: String(e) };
  }

  revalidatePath("/admin/pracownicy");
  return { status: "ok" };
}

export async function toggleStaffActiveAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString()!;
  const active = formData.get("active") === "true";
  await toggleStaffActive(id, active);
  revalidatePath("/admin/pracownicy");
}

export async function deleteStaffAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString()!;
  await deleteStaff(id);
  revalidatePath("/admin/pracownicy");
}
