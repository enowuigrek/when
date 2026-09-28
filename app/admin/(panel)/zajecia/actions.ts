"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanelAccess } from "@/lib/auth/panel-access";
import { getAdminTenantId, getAdminTenantFeatures } from "@/lib/tenant";
import { hasFeature } from "@/lib/features";
import { getClassGroupsForTenant } from "@/lib/db/class-groups";
import { enrollInGroup } from "@/lib/db/class-enrollment";
import { enrollVocabulary } from "@/lib/vocabulary";
import { createAdminClient } from "@/lib/supabase/admin";

export type AddToGroupState = { status: "idle" | "error" | "ok"; message?: string };

const schema = z.object({
  groupId: z.string().uuid(),
  mode: z.enum(["karnet", "probne"]),
  childName: z.string().trim().min(2, "Podaj imię i nazwisko dziecka.").max(120),
  // Which meeting the month starts from. Absent means the next one.
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
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
    from: parsed.data.startDate || undefined,
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


// ── Configuring when a course meets ───────────────────────────────────────
//
// The days and hours are the one thing about a course that a studio changes
// on its own — a group moves an hour later, a new day opens in September.
// Seeding them was fine for a demo and useless for an account.

const slotSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  serviceId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Godzina w formacie 15:45."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Godzina w formacie 17:15."),
  ageLabel: z.string().trim().max(60).optional().or(z.literal("")),
  minParticipants: z.coerce.number().int().min(1).max(100).optional().or(z.literal("")),
  maxParticipants: z.coerce.number().int().min(1).max(200).optional().or(z.literal("")),
});

export type SlotState = { status: "idle" | "error" | "ok"; message?: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function saveClassGroupAction(
  _prev: SlotState,
  formData: FormData
): Promise<SlotState> {
  await requirePanelAccess();
  const parsed = slotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź formularz." };
  }
  const d = parsed.data;
  if (d.endTime <= d.startTime) {
    return { status: "error", message: "Koniec musi być po początku." };
  }

  const tenantId = await getAdminTenantId();
  if (!hasFeature(await getAdminTenantFeatures(), "grupy")) {
    return { status: "error", message: "Zajęcia grupowe nie są tu włączone." };
  }
  const supabase = createAdminClient();

  const row = {
    tenant_id: tenantId,
    service_id: d.serviceId,
    day_of_week: d.dayOfWeek,
    start_time: `${d.startTime}:00`,
    end_time: `${d.endTime}:00`,
    age_label: d.ageLabel || null,
    min_participants: d.minParticipants === "" ? null : (d.minParticipants ?? null),
    max_participants: d.maxParticipants === "" ? null : (d.maxParticipants ?? null),
  };

  if (d.id) {
    // The slug stays put on an edit. It is in the links a parent may already
    // hold, and moving a class an hour later is not a new class.
    const { error } = await supabase
      .from("class_groups")
      .update(row)
      .eq("tenant_id", tenantId)
      .eq("id", d.id);
    if (error) return { status: "error", message: error.message };
  } else {
    const { data: service } = await supabase
      .from("services")
      .select("slug")
      .eq("tenant_id", tenantId)
      .eq("id", d.serviceId)
      .maybeSingle();
    const base = `${slugify((service?.slug as string) ?? "grupa")}-${WEEKDAY_SLUG[d.dayOfWeek]}-${d.startTime.replace(":", "")}`;
    const { error } = await supabase.from("class_groups").insert({ ...row, slug: base });
    if (error) {
      return {
        status: "error",
        message: error.message.includes("duplicate")
          ? "Takie zajęcia już są w grafiku."
          : error.message,
      };
    }
  }

  revalidatePath("/admin/zajecia");
  revalidatePath("/admin/harmonogram");
  return { status: "ok", message: "Zapisano." };
}

const WEEKDAY_SLUG = ["nd", "pn", "wt", "sr", "cz", "pt", "sb"];

/**
 * Retire a weekly slot.
 *
 * Deactivated rather than deleted while anybody is still booked into it:
 * the bookings point at it, and a class that vanishes takes its register
 * with it.
 */
export async function deleteClassGroupAction(
  _prev: SlotState,
  formData: FormData
): Promise<SlotState> {
  await requirePanelAccess();
  const id = formData.get("id")?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Złe id." };

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("class_group_id", id)
    .neq("status", "cancelled")
    .gte("starts_at", new Date().toISOString());

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("class_groups")
      .update({ active: false })
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) return { status: "error", message: error.message };
    revalidatePath("/admin/zajecia");
    return {
      status: "ok",
      message: `Zajęcia wyłączone z zapisów. Zostaje ${count} umówionych spotkań — odwołaj je w harmonogramie, jeśli mają przepaść.`,
    };
  }

  const { error } = await supabase
    .from("class_groups")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) return { status: "error", message: error.message };
  revalidatePath("/admin/zajecia");
  revalidatePath("/admin/harmonogram");
  return { status: "ok", message: "Usunięto." };
}
