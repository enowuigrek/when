"use client";

import { PastBookingIndicator } from "@/components/past-booking-indicator";
import { markNoShowAction } from "../actions";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  customerName: string;
  serviceName: string | null;
  timeLabel: string;
  color: string;
};

export function DayBookingCard({ id, startsAtIso, endsAtIso, customerName, serviceName, timeLabel, color }: Props) {
  const router = useRouter();

  async function handleNoShow(bookingId: string) {
    const fd = new FormData();
    fd.set("id", bookingId);
    await markNoShowAction(fd);
    router.refresh();
  }

  return (
    <div className="rounded px-2 py-1.5" style={{ backgroundColor: `${color}20`, borderLeft: `2px solid ${color}` }}>
      <p className="font-mono text-xs text-zinc-300">{timeLabel}</p>
      <p className="text-xs font-medium text-zinc-200 leading-tight">{customerName}</p>
      {serviceName && <p className="text-xs text-zinc-500">{serviceName}</p>}
      <PastBookingIndicator
        bookingId={id}
        startsAtIso={startsAtIso}
        endsAtIso={endsAtIso}
        customerName={customerName}
        onMarkNoShow={handleNoShow}
      />
    </div>
  );
}
