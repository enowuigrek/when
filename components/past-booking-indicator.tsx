"use client";

import { useEffect, useState } from "react";

type Props = {
  bookingId: string;
  endsAtIso: string;
  startsAtIso: string;
  customerName: string;
  onMarkNoShow: (id: string) => Promise<void>;
};

export function PastBookingIndicator({ bookingId, endsAtIso, startsAtIso, customerName, onMarkNoShow }: Props) {
  const [isPast, setIsPast] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function check() {
      // Show indicator 15 min after appointment start
      const graceMs = 15 * 60 * 1000;
      setIsPast(Date.now() > new Date(startsAtIso).getTime() + graceMs);
    }
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [startsAtIso]);

  if (!isPast) return null;

  return (
    <button
      title={`${customerName} — oznacz jako nie przyszedł`}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await onMarkNoShow(bookingId);
      }}
      className="mt-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-500 hover:bg-amber-500/10 disabled:opacity-50 transition-colors"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Nie przyszedł?
    </button>
  );
}
