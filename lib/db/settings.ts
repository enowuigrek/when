import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  maps_url: string | null;
  logo_url: string | null;
  slot_granularity_min: number;
  booking_horizon_days: number;
};

export type TimeFilter = {
  id: string;
  label: string;
  from_hour: number;
  to_hour: number;
  sort_order: number;
  active: boolean;
};

// Fallback used only if DB not yet seeded.
const FALLBACK: Settings = {
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
  maps_url: null,
  logo_url: null,
  slot_granularity_min: 15,
  booking_horizon_days: 21,
};

export async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (data as Settings | null) ?? FALLBACK;
}

export async function getTimeFilters(): Promise<TimeFilter[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("time_filters")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as TimeFilter[];
}

export async function getAllTimeFilters(): Promise<TimeFilter[]> {
  const { data } = await createAdminClient()
    .from("time_filters")
    .select("*")
    .order("sort_order");
  return (data ?? []) as TimeFilter[];
}
