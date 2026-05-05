import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";

export type Settings = {
  id: number;
  business_name: string;
  tagline: string | null;
  description: string | null;
  address_street: string | null;
  address_city: string | null;
  address_postal: string | null;
  phone: string | null;
  email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  website_url: string | null;
  maps_url: string | null;
  logo_url: string | null;
  slot_granularity_min: number;
  booking_horizon_days: number;
  color_accent: string;
  theme: "dark" | "light" | "system";
};

export type TimeFilter = {
  id: string;
  label: string;
  from_hour: number;
  to_hour: number;
  sort_order: number;
  active: boolean;
};

export const FALLBACK_SETTINGS: Settings = {
  id: 1,
  business_name: "when?",
  tagline: null,
  description: null,
  address_street: null,
  address_city: null,
  address_postal: null,
  phone: null,
  email: null,
  instagram_url: null,
  facebook_url: null,
  website_url: null,
  maps_url: null,
  logo_url: null,
  slot_granularity_min: 15,
  booking_horizon_days: 21,
  color_accent: "#d4a26a",
  theme: "system" as const,
};

export async function getSettings(): Promise<Settings> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data as Settings | null) ?? FALLBACK_SETTINGS;
}

export async function getTimeFilters(): Promise<TimeFilter[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("time_filters")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as TimeFilter[];
}

export async function getAllTimeFilters(): Promise<TimeFilter[]> {
  const tenantId = await getAdminTenantId();
  const { data } = await createAdminClient()
    .from("time_filters")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order");
  return (data ?? []) as TimeFilter[];
}
