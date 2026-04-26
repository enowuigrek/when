import { notFound } from "next/navigation";
import { getStaffById, getStaffServiceIds } from "@/lib/db/staff";
import { getServices } from "@/lib/db/services";
import { getStaffSchedule, getStaffTimeOff } from "@/lib/db/staff-schedule";
import { StaffForm } from "../staff-form";
import { updateStaffAction } from "../actions";
import { StaffScheduleForm } from "../staff-schedule-form";
import { TimeOffSection } from "../time-off-section";

export const metadata = { title: "Edytuj pracownika", robots: { index: false } };

type Params = Promise<{ id: string }>;

export default async function EditStaffPage({ params }: { params: Params }) {
  const { id } = await params;
  const [staff, services, assignedServiceIds, schedule, timeOff] = await Promise.all([
    getStaffById(id),
    getServices(),
    getStaffServiceIds(id),
    getStaffSchedule(id),
    getStaffTimeOff(id),
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

      <hr className="my-10 border-zinc-800/60" />

      <h2 className="text-lg font-semibold tracking-tight">Grafik tygodniowy</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Godziny pracy tego pracownika. Klienci zobaczą tylko sloty w tych godzinach.
        Jeśli dzień nie jest zaznaczony, pracownik nie przyjmuje w ten dzień.
      </p>
      <div className="mt-6">
        <StaffScheduleForm staffId={id} schedule={schedule} />
      </div>

      <hr className="my-10 border-zinc-800/60" />

      <h2 className="text-lg font-semibold tracking-tight">Nieobecności i urlopy</h2>
      <p className="mt-1 text-sm text-zinc-500">
        L4, urlopy, wyjścia prywatne — w tych dniach pracownik nie będzie widoczny w rezerwacjach.
      </p>
      <div className="mt-6">
        <TimeOffSection staffId={id} timeOff={timeOff} />
      </div>
    </div>
  );
}
