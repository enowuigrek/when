"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantIdBySlug } from "@/lib/tenant";
import { getSettingsForTenant, getFeaturesForTenant } from "@/lib/db/for-tenant";
import { getClassGroupBySlugForTenant } from "@/lib/db/class-groups";
import { enrollInGroup } from "@/lib/db/class-enrollment";
import { nextMeetings } from "@/lib/class-groups";
import { recordBookingEvent } from "@/lib/db/booking-events";
import { sendPushToTenant } from "@/lib/push";
import { sendEmail } from "@/lib/email/send";
import { buildOwnerNotificationEmail } from "@/lib/email/owner-notification";
import { hasFeature } from "@/lib/features";

export type EnrollState = { status: "idle" | "error"; message?: string };

const schema = z.object({
  tenantSlug: z.string().min(1),
  groupSlug: z.string().min(1),
  mode: z.enum(["karnet", "probne"]),
  childName: z.string().trim().min(2, "Podaj imię i nazwisko dziecka.").max(120),
  guardianName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().min(7, "Podaj numer telefonu.").max(30),
  email: z.string().trim().email("Niepoprawny e-mail.").optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

/**
 * Sign a child up for a recurring group.
 *
 * A month is the unit the studio sells, so a sign-up books the whole month at
 * once: four meetings, one package, numbered 1/4 … 4/4 by the counter that
 * already exists. Booking only the first and asking the owner to add the rest
 * by hand is how the package gets forgotten halfway through.
 */
export async function enrollAction(
  _prev: EnrollState,
  formData: FormData
): Promise<EnrollState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź formularz." };
  }
  const { tenantSlug, groupSlug, mode } = parsed.data;

  const tenantId = await getTenantIdBySlug(tenantSlug);
  if (!tenantId) return { status: "error", message: "Nieznana pracownia." };

  const features = await getFeaturesForTenant(tenantId);
  if (!hasFeature(features, "grupy")) {
    return { status: "error", message: "Zapisy na zajęcia nie są tu włączone." };
  }

  const group = await getClassGroupBySlugForTenant(groupSlug, tenantId);
  if (!group || !group.active) return { status: "error", message: "Te zajęcia nie są dostępne." };

  const service = group.service;

  const enrolled = await enrollInGroup({
    group,
    tenantId,
    mode,
    childName: parsed.data.childName,
    phone: parsed.data.phone,
    guardianName: parsed.data.guardianName,
    email: parsed.data.email,
    notes: parsed.data.notes,
  });
  if (!enrolled.ok) {
    return {
      status: "error",
      message:
        mode === "karnet" && enrolled.message.startsWith("W tej grupie zabrakło")
          ? `${enrolled.message} Napisz do nas — dopiszemy do listy.`
          : enrolled.message,
    };
  }

  const meetings = nextMeetings(group, 1);
  const email = parsed.data.email?.trim() || null;
  const first = enrolled.bookingIds[0];
  // Rebuilt for the owner's email only — the booking itself already carries it.
  const notes =
    [
      parsed.data.guardianName?.trim() ? `Rodzic/opiekun: ${parsed.data.guardianName.trim()}` : null,
      mode === "probne" ? "Zajęcia próbne" : null,
      parsed.data.notes?.trim() || null,
    ]
      .filter(Boolean)
      .join(" · ") || null;

  // One event for one sign-up: four bell entries for a single decision would
  // be four times the noise and none of the extra information.
  await recordBookingEvent({
    bookingId: first,
    eventType: "created",
    source: "customer",
    customerName: parsed.data.childName,
    serviceName: `${service.name}${group.age_label ? ` · ${group.age_label}` : ""}`,
    startsAtIso: meetings[0].startsAtIso,
    tenantId,
  });

  const settings = await getSettingsForTenant(tenantId);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (settings.email) {
    const { subject, html, text } = buildOwnerNotificationEmail({
      bookingId: first,
      customerName: parsed.data.childName,
      customerPhone: parsed.data.phone,
      customerEmail: email,
      serviceName: `${service.name}${group.age_label ? ` · ${group.age_label}` : ""}`,
      staffName: null,
      startsAtIso: meetings[0].startsAtIso,
      endsAtIso: meetings[0].endsAtIso,
      pricePln: mode === "karnet" ? service.price_pln : 0,
      notes,
      businessName: settings.business_name,
      adminUrl: `${siteUrl}/admin/harmonogram`,
    });
    sendEmail({ to: settings.email, subject, html, text }).catch(() => {});
  }

  sendPushToTenant(tenantId, {
    title: mode === "karnet" ? "Nowy zapis na zajęcia" : "Zapis na zajęcia próbne",
    body: `${parsed.data.childName} · ${service.name}`,
    url: "/admin/harmonogram",
    tag: "booking-new",
  }).catch(() => {});

  revalidatePath(`/widget/${tenantSlug}`);
  redirect(`/rezerwacja/sukces/${first}`);
}
