import { notFound } from "next/navigation";
import { getStaffById, getStaffServiceIds } from "@/lib/db/staff";
import { getServices } from "@/lib/db/services";
import { StaffForm } from "../staff-form";
import { updateStaffAction } from "../actions";

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
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        Edytuj — {staff.name}
      </h1>
      <StaffForm
        action={updateStaffAction}
        staff={staff}
        services={services}
        assignedServiceIds={assignedServiceIds}
      />
    </div>
  );
}
