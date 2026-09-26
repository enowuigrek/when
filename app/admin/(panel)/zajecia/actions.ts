"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanelAccess } from "@/lib/auth/panel-access";
import { getAdminTenantId, getAdminTenantFeatures } from "@/lib/tenant";
import { hasFeature } from "@/lib/features";
import { getClassGroupsForTenant } from "@/lib/db/class-groups";
import { enrollInGroup } from "@/lib/db/class-enrollment";
import { enrollVocabulary } from "@/lib/vocabulary";

export type AddToGroupState = { status: "idle" | "error" | "ok"; message?: string };

const schema = z.object({
  groupId: z.string().uuid(),
  mode: z.enum(["karnet", "probne"]),
  childName: z.string().trim().min(2, "Podaj imię i nazwisko dziecka.").max(120),
  guardianName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().min(7, "Podaj numer telefonu.").max(30),
  email: z.string().trim().email("Niepoprawny e-mail.").optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

/**
 * The owner adding a child to a group by hand.
 *
 * Deliberately the same path as the parent's sign-up: one shared core decides
 * which meetings get booked and how the karnet is priced, so a child added at
 * the counter is indistinguishable from one who signed up online.
 */
export async function addToGroupAction(
  _prev: AddToGroupState,
  formData: FormData
): Promise<AddToGroupState> {
  await requirePanelAccess();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź formularz." };
  }

  const tenantId = await getAdminTenantId();
  const features = await getAdminTenantFeatures();
  if (!hasFeature(features, "grupy")) {
    return { status: "error", message: "Zajęcia grupowe nie są tu włączone." };
  }

  const group = (await getClassGroupsForTenant(tenantId)).find(
    (g) => g.id === parsed.data.groupId
  );
  if (!group) return { status: "error", message: "Nie ma takiej grupy." };

  const words = enrollVocabulary(group.service);
  if (words.guardian && !parsed.data.guardianName?.trim()) {
    return { status: "error", message: `Uzupełnij: ${words.guardian}.` };
  }

  const result = await enrollInGroup({
    group,
    tenantId,
    mode: parsed.data.mode,
    childName: parsed.data.childName,
    phone: parsed.data.phone,
    guardianName: parsed.data.guardianName,
    email: parsed.data.email,
    notes: parsed.data.notes,
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidatePath("/admin/zajecia");
  revalidatePath("/admin/harmonogram");
  return {
    status: "ok",
    message:
      result.bookingIds.length > 1
        ? `Zapisano na ${result.bookingIds.length} spotkania.`
        : "Zapisano na jedno spotkanie.",
  };
}
