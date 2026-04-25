import { getServices, getBusinessHours } from "@/lib/db/services";
import { AdminBookingForm } from "./admin-booking-form";

export const metadata = { title: "Nowa rezerwacja", robots: { index: false } };

export default async function AdminNewBookingPage() {
  const [services, hours] = await Promise.all([getServices(), getBusinessHours()]);

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Nowa rezerwacja</h1>
      <p className="text-sm text-zinc-500 mb-8">Rezerwacja przez telefon lub wizytę osobistą.</p>
      <AdminBookingForm services={services} hours={hours} />
    </section>
  );
}
