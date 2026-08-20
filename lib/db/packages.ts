import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTenantId } from "@/lib/tenant";
import { upsertCustomerForTenant } from "@/lib/db/customers";

export type PackageStatus = "active" | "completed" | "cancelled";

export type PackageProgress = {
  id: string;
  serviceId: string;
  serviceName: string;
  totalLessons: number;
  status: PackageStatus;
  createdAt: string;
  /** Booked, still ahead, not cancelled. */
  scheduled: number;
  /** Already behind us and not cancelled. */
  done: number;
  cancelled: number;
  /** What is left to agree a date for. Never negative. */
  toSchedule: number;
};

/**
 * The open package a lesson should attach to, if there is one.
 *
 * One customer can buy the same package twice — finish five lessons, buy five
 * more — so this looks only at the one still running.
 */
export async function findOpenPackageForTenant(
  customerId: string,
  serviceId: string,
  tenantId: string
): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("service_packages")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .eq("service_id", serviceId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Attach to the customer's open package for this service, or start one.
 *
 * Called when a booking is made for a service sold as a package. Nobody is
 * asked to lay out all N lessons up front: the first booking opens the package,
 * the rest join it as the customer rings up to agree each date.
 */
export async function ensurePackageForTenant(input: {
  serviceId: string;
  customerId: string;
  totalLessons: number;
  tenantId: string;
}): Promise<string | null> {
  const existing = await findOpenPackageForTenant(
    input.customerId,
    input.serviceId,
    input.tenantId
  );
  if (existing) return existing;

  const { data, error } = await createAdminClient()
    .from("service_packages")
    .insert({
      tenant_id: input.tenantId,
      service_id: input.serviceId,
      customer_id: input.customerId,
      total_lessons: input.totalLessons,
    })
    .select("id")
    .single();

  if (error) {
    // A package that fails to open must not take the booking down with it —
    // the appointment is the thing the customer is waiting on. It shows up
    // unattached and can be linked later.
    console.error("[packages] could not open a package:", error.message);
    return null;
  }
  return data.id as string;
}

/**
 * Every package a customer holds, with its progress.
 *
 * The counters all come from one set of bookings, split by date and status —
 * there is no separate tally to keep in step with reality.
 */
export async function getCustomerPackagesForTenant(
  customerId: string,
  tenantId: string
): Promise<PackageProgress[]> {
  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from("service_packages")
    .select("id, service_id, total_lessons, status, created_at, service:services(name)")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  type Row = {
    id: string; service_id: string; total_lessons: number;
    status: PackageStatus; created_at: string;
    service: { name: string } | null;
  };
  const packages = (rows ?? []) as unknown as Row[];
  if (packages.length === 0) return [];

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("package_id, starts_at, status")
    .eq("tenant_id", tenantId)
    .in("package_id", packages.map((p) => p.id));

  type B = { package_id: string; starts_at: string; status: string };
  const bookings = (bookingRows ?? []) as B[];
  const now = new Date().toISOString();

  return packages.map((p) => {
    const mine = bookings.filter((b) => b.package_id === p.id);
    const cancelled = mine.filter((b) => b.status === "cancelled").length;
    const live = mine.filter((b) => b.status !== "cancelled");
    const scheduled = live.filter((b) => b.starts_at >= now).length;
    const done = live.filter((b) => b.starts_at < now).length;
    return {
      id: p.id,
      serviceId: p.service_id,
      serviceName: p.service?.name ?? "—",
      totalLessons: p.total_lessons,
      status: p.status,
      createdAt: p.created_at,
      scheduled,
      done,
      cancelled,
      toSchedule: Math.max(0, p.total_lessons - scheduled - done),
    };
  });
}

/** Admin-side wrapper — the panel already knows which tenant it is. */
export async function getCustomerPackages(customerId: string): Promise<PackageProgress[]> {
  return getCustomerPackagesForTenant(customerId, await getAdminTenantId());
}

/**
 * The package a new booking belongs to, if the service is sold as one.
 *
 * Returns null for an ordinary service, which is every service that existed
 * before this feature — those keep booking exactly as they did.
 *
 * Called from all four booking paths, so the rule lives in one place: the
 * customer record is what a package hangs on, so it is created or found first,
 * then the open package, then the booking carries the id.
 */
export async function attachToPackageForTenant(input: {
  service: { id: string; total_lessons: number | null };
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  tenantId: string;
}): Promise<string | null> {
  const total = input.service.total_lessons;
  if (!total || total < 1) return null;

  try {
    const customerId = await upsertCustomerForTenant(
      { phone: input.customerPhone, name: input.customerName, email: input.customerEmail },
      input.tenantId
    );
    return await ensurePackageForTenant({
      serviceId: input.service.id,
      customerId,
      totalLessons: total,
      tenantId: input.tenantId,
    });
  } catch (e) {
    // Same reasoning as ensurePackageForTenant: never lose the appointment
    // over the bookkeeping around it.
    console.error("[packages] could not attach booking to a package:", e);
    return null;
  }
}
