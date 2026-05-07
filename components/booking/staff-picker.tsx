"use client";

type StaffOption = { id: string; name: string; color: string };

type Props = {
  staff: StaffOption[];
  /** "" means "Dowolny" / any staff. */
  selectedStaffId: string;
  onPick: (id: string) => void;
  /** Optional: dates on which a given staff member is unavailable. Used to dim them in widget. */
  unavailableForStaffId?: (id: string) => boolean;
};

/**
 * Shared staff picker — pill buttons with color dots + "Dowolny" first.
 * Used by both admin "new booking" and the widget client flow.
 */
export function StaffPicker({ staff, selectedStaffId, onPick, unavailableForStaffId }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onPick("")}
        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
          selectedStaffId === ""
            ? "border-zinc-500 bg-zinc-800 text-zinc-100"
            : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
        }`}
      >
        Dowolny
      </button>
      {staff.map((s) => {
        const isSelected = s.id === selectedStaffId;
        const dimmed = unavailableForStaffId?.(s.id) ?? false;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
              isSelected
                ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                : dimmed
                ? "border-zinc-800/60 bg-zinc-900/20 text-zinc-600 opacity-60"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
            }`}
          >
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: s.color, opacity: dimmed ? 0.5 : 1 }}
            />
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
