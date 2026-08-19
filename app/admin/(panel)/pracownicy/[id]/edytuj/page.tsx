import { AdminLink } from "@/components/admin-link";
import { notFound } from "next/navigation";
import { getStaffById, getStaffServiceIds } from "@/lib/db/staff";
import { PageShell } from "@/components/ui/page-shell";
import { getServices } from "@/lib/db/services";
import { StaffForm } from "../../staff-form";
import { updateStaffAction } from "../../actions";

export const metadata = { title: "Edytuj pracownika", robots: { index: false } };

type Params = Promise<{ id: string }>;

export default async function EditStaffPage({ params }: { params: Params }) {
  const { id } = await params;
  const [staff, services, assignedServiceIds] = await Promise.all([
    getStaffById(id),
    getServices(),
    getStaffServiceIds(id),
  ]);

  if (!staff) notFound();

  return (
    <PageShell
      narrow
      title={`Edytuj — ${staff.name}`}
      subtitle="Godziny pracy i nieobecności tego pracownika ustawisz w Grafiku."
      back={
        <AdminLink href={`/admin/pracownicy/${staff.id}`} className="inline-flex text-sm text-zinc-500 hover:text-zinc-300">
          ← {staff.name}
        </AdminLink>
      }
    >
      <StaffForm
        action={updateStaffAction}
        staff={staff}
        services={services}
        assignedServiceIds={assignedServiceIds}
      />
    </PageShell>
  );
}
