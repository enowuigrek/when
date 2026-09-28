"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanelAccess } from "@/lib/auth/panel-access";
import { getAdminTenantId, getAdminTenantFeatures } from "@/lib/tenant";
import { hasFeature } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Configuring when a course meets ───────────────────────────────────────
//
// The days and hours are the one thing about a course that a studio changes
// on its own — a group moves an hour later, a new day opens in September.
// Seeding them was fine for a demo and useless for an account.
//
// They live with the service because that is where a course is made: the
// description, the price, how long a meeting runs, how many a month holds and
// the days it meets are one definition. The classes page is the register.

const slotSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  serviceId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Godzina w formacie 15:45."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Godzina w formacie 17:15."),
  ageLabel: z.string().trim().max(60).optional().or(z.literal("")),
  minParticipants: z.coerce.number().int().min(1).max(100).optional().or(z.literal("")),
  maxParticipants: z.coerce.number().int().min(1).max(200).optional().or(z.literal("")),
  // Sent only by the form of a day that was switched off: saving it is how
  // the owner takes it back.
  active: z.literal("true").optional(),
});

export type SlotState = { status: "idle" | "error" | "ok"; message?: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const WEEKDAY_SLUG = ["nd", "pn", "wt", "sr", "cz", "pt", "sb"];

function revalidateSchedule() {
  revalidatePath("/admin/zajecia");
  revalidatePath("/admin/harmonogram");
  // The service's own edit page, which is where the list being changed sits.
  // A route pattern has to spell out the (panel) group to match anything.
  revalidatePath("/admin/(panel)/uslugi/[id]", "page");
}

/** Meetings still ahead in a slot — what moving or retiring it would strand. */
async function upcomingInSlot(tenantId: string, groupId: string): Promise<number> {
  const { count } = await createAdminClient()
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("class_group_id", groupId)
    .neq("status", "cancelled")
    .gte("starts_at", new Date().toISOString());
  return count ?? 0;
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

  // The service id comes from the form, so it is only a claim until this
  // tenant is shown to own it — otherwise a slot could hang off somebody
  // else's course.
  const { data: service } = await supabase
    .from("services")
    .select("slug")
    .eq("tenant_id", tenantId)
    .eq("id", d.serviceId)
    .maybeSingle();
  if (!service) return { status: "error", message: "Nie ma takich zajęć." };

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
    const { data: current } = await supabase
      .from("class_groups")
      .select("day_of_week")
      .eq("tenant_id", tenantId)
      .eq("id", d.id)
      .maybeSingle();
    if (!current) return { status: "error", message: "Nie ma takiego dnia." };

    // An hour later is the same class; its meetings still count towards it,
    // because seats are counted over the whole day. Another weekday is not:
    // the booked Mondays would stay on Mondays, belong to a Tuesday group and
    // drop out of every count. So a day with children in it is not moved —
    // the new day is added and this one retired.
    if (current.day_of_week !== d.dayOfWeek && (await upcomingInSlot(tenantId, d.id)) > 0) {
      return {
        status: "error",
        message:
          "Na ten dzień są już zapisane dzieci. Dodaj nowy dzień, a ten usuń — umówione spotkania zostaną.",
      };
    }

    // The slug stays put on an edit. It is in the links a parent may already
    // hold, and moving a class an hour later is not a new class.
    const { error } = await supabase
      .from("class_groups")
      .update(d.active ? { ...row, active: true } : row)
      .eq("tenant_id", tenantId)
      .eq("id", d.id);
    if (error) return { status: "error", message: error.message };
  } else {
    const base = `${slugify(service.slug as string)}-${WEEKDAY_SLUG[d.dayOfWeek]}-${d.startTime.replace(":", "")}`;
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

  revalidateSchedule();
  return { status: "ok", message: "Zapisano." };
}

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
  if (!hasFeature(await getAdminTenantFeatures(), "grupy")) {
    return { status: "error", message: "Zajęcia grupowe nie są tu włączone." };
  }
  const supabase = createAdminClient();

  const count = await upcomingInSlot(tenantId, id);
  if (count > 0) {
    const { error } = await supabase
      .from("class_groups")
      .update({ active: false })
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) return { status: "error", message: error.message };
    revalidateSchedule();
    return {
      status: "ok",
      message: `Dzień wyłączony z zapisów. Umówione spotkania zostają (${count}) — odwołaj je w harmonogramie, jeśli mają przepaść.`,
    };
  }

  const { error } = await supabase
    .from("class_groups")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) return { status: "error", message: error.message };
  revalidateSchedule();
  return { status: "ok", message: "Usunięto." };
}
