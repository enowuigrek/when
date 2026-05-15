import { redirect } from "next/navigation";
import { isAdminAuthenticated, getSessionTenantId } from "@/lib/auth/admin-session";
import { isSessionSuperAdmin } from "@/lib/auth/super-admin";
import { SuperAdminNav } from "./nav";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  if (!(await isSessionSuperAdmin())) redirect("/admin");

  return (
    <div className="min-h-screen bg-zinc-950">
      <SuperAdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
