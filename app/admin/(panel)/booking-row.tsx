import { formatWarsawTime } from "@/lib/slots";
import type { BookingWithService } from "@/lib/db/bookings";
import { cancelBookingAction } from "./actions";

export function BookingRow({ b }: { b: BookingWithService }) {
  const cancelled = b.status === "cancelled";
  return (
    <li
      className={`flex items-start gap-4 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 ${
        cancelled ? "opacity-50" : ""
      }`}
    >
      <div className="w-20 shrink-0 font-mono text-lg text-[var(--color-accent)]">
        {formatWarsawTime(b.starts_at)}
        <div className="font-mono text-xs text-zinc-500">
          {formatWarsawTime(b.ends_at)}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-medium text-zinc-100">{b.customer_name}</span>
          <a
            href={`tel:${b.customer_phone}`}
            className="font-mono text-sm text-zinc-400 hover:text-[var(--color-accent)]"
          >
            {b.customer_phone}
          </a>
        </div>
        <div className="mt-1 text-sm text-zinc-400">
          {b.service?.name ?? "—"}
          {b.service && (
            <span className="ml-2 text-zinc-600">
              · {b.service.duration_min} min · {b.service.price_pln} zł
            </span>
          )}
        </div>
        {b.notes && (
          <p className="mt-2 rounded border-l-2 border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-300">
            {b.notes}
          </p>
        )}
        {cancelled && (
          <p className="mt-1 text-xs uppercase tracking-wider text-red-400">
            Anulowana
          </p>
        )}
      </div>

      {!cancelled && (
        <form action={cancelBookingAction}>
          <input type="hidden" name="id" value={b.id} />
          <button
            type="submit"
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-red-900 hover:bg-red-950/20 hover:text-red-400"
          >
            Anuluj
          </button>
        </form>
      )}
    </li>
  );
}
