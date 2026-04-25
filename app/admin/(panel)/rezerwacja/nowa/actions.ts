"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { getServiceBySlug } from "@/lib/db/services";
import { createBooking } from "@/lib/db/bookings";

const schema = z.object({
  serviceId: z.string().uuid("Wybierz usługę"),
  serviceSlug: z.string().min(1),
  startsAt: z.string().min(1, "Wybierz datę i godzinę"),
  customerName: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  customerPhone: z.string().trim().min(7, "Numer za krótki").max(30),
  customerEmail: z.string().trim().email("Niepoprawny email").optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(500).optional(),
});

export type AdminBookingState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function createAdminBookingAction(
  _prev: AdminBookingState,
  formData: FormData
): Promise<AdminBookingState> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const raw = {
    serviceId: formData.get("serviceId")?.toString() ?? "",
    serviceSlug: formData.get("serviceSlug")?.toString() ?? "",
    startsAt: formData.get("startsAt")?.toString() ?? "",
    customerName: formData.get("customerName")?.toString() ?? "",
    customerPhone: formData.get("customerPhone")?.toString() ?? "",
    customerEmail: formData.get("customerEmail")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Sprawdź formularz.", fieldErrors };
  }

  const service = await getServiceBySlug(parsed.data.serviceSlug);
  if (!service) return { status: "error", message: "Usługa nie istnieje." };

  // startsAt comes from datetime-local input — treat as Warsaw local time.
  const localIso = parsed.data.startsAt; // "YYYY-MM-DDTHH:mm"
  const startsAt = new Date(localIso); // interpreted as local (browser/server TZ)
  // Force Warsaw interpretation using offset.
  const warsawOffset = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    timeZoneName: "shortOffset",
  }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "+02:00";
  const startsAtUtc = new Date(`${localIso}:00${warsawOffset.replace("GMT", "")}`);
  const endsAtUtc = new Date(startsAtUtc.getTime() + service.duration_min * 60_000);

  const result = await createBooking({
    serviceId: service.id,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    customerEmail: parsed.data.customerEmail ?? null,
    startsAtIso: startsAtUtc.toISOString(),
    endsAtIso: endsAtUtc.toISOString(),
    notes: parsed.data.notes ?? null,
  });

  if (!result.ok) return { status: "error", message: result.message };

  revalidatePath("/admin");
  revalidatePath("/admin/tydzien");
  redirect("/admin");
}
