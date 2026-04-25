import { getServices } from "@/lib/db/services";
import { StaffForm } from "../staff-form";
import { createStaffAction } from "../actions";

export const metadata = { title: "Nowy pracownik", robots: { index: false } };

export default async function NowyPracownikPage() {
  const services = await getServices();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Nowy pracownik</h1>
      <StaffForm action={createStaffAction} services={services} />
    </div>
  );
}
