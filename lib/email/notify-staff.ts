import "server-only";
import { getStaffById } from "@/lib/db/staff";
import { getSettings } from "@/lib/db/settings";
import { getSettingsForTenant, getStaffByIdForTenant } from "@/lib/db/for-tenant";
import { sendEmail } from "./send";
import { buildStaffNotificationEmail, type StaffNotifType } from "./staff-notification";

type NotifyStaffInput = {
  staffId: string;
  type: StaffNotifType;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  startsAtIso: string;
  endsAtIso: string;
  /** For reassigned_to */
  previousStaffName?: string | null;
  /** For unassigned */
  newStaffName?: string | null;
  tenantId?: string;
};

/**
 * Looks up staff email, builds appropriate template and sends fire-and-forget.
 * Safe to call without awaiting — all errors are swallowed.
 */
export async function notifyStaff(input: NotifyStaffInput): Promise<void> {
  const staff = input.tenantId
    ? await getStaffByIdForTenant(input.staffId, input.tenantId)
    : await getStaffById(input.staffId);
  if (!staff?.email) return;

  const settings = input.tenantId ? await getSettingsForTenant(input.tenantId) : await getSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const { subject, html, text } = buildStaffNotificationEmail({
    type: input.type,
    staffName: staff.name,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    serviceName: input.serviceName,
    startsAtIso: input.startsAtIso,
    endsAtIso: input.endsAtIso,
    businessName: settings.business_name,
    adminUrl: `${siteUrl}/admin/harmonogram`,
    previousStaffName: input.previousStaffName,
    newStaffName: input.newStaffName,
  });

  await sendEmail({ to: staff.email, subject, html, text });
}
