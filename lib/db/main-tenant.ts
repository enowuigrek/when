import "server-only";
import { MAIN_TENANT_ID } from "@/lib/tenant";
import {
  getServicesForTenant,
  getServiceBySlugForTenant,
  getBusinessHoursForTenant,
  getActiveStaffForTenant,
  getSettingsForTenant,
  getTimeFiltersForTenant,
} from "./for-tenant";

/**
 * Helpers for the public marketing/booking site at the root domain
 * (whenbooking.pl/, /rezerwacja, /godziny, /kontakt, etc).
 *
 * These pages are *always* the main tenant — a logged-in admin's
 * session cookie must NOT leak their tenant onto the public site.
 * The generic getSettings()/getServices() in lib/db/{settings,services}
 * read the admin-session tenant by design, so public pages call these
 * thin main-tenant aliases instead.
 */

export const getMainSettings = () => getSettingsForTenant(MAIN_TENANT_ID);
export const getMainServices = () => getServicesForTenant(MAIN_TENANT_ID);
export const getMainBusinessHours = () => getBusinessHoursForTenant(MAIN_TENANT_ID);
export const getMainActiveStaff = () => getActiveStaffForTenant(MAIN_TENANT_ID);
export const getMainTimeFilters = () => getTimeFiltersForTenant(MAIN_TENANT_ID);
export const getMainServiceBySlug = (slug: string) =>
  getServiceBySlugForTenant(slug, MAIN_TENANT_ID);
