"use client";

import { StaffChip, type ChipStaff } from "@/components/ui/staff-chip";

type Props = {
  staff: ChipStaff[];
  /** "" means "Dowolny" / any staff. */
  selectedStaffId: string;
  onPick: (id: string) => void;
  /** Dates on which a given staff member is unavailable — dims them in the widget. */
  unavailableForStaffId?: (id: string) => boolean;
};

/**
 * Staff step of the booking forms. The chip itself lives in StaffChip, shared
 * with the schedule filter, so picking a person looks the same wherever you
 * do it — including lighting up in their own colour rather than plain grey.
 */
export function StaffPicker({ staff, selectedStaffId, onPick, unavailableForStaffId }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <StaffChip selected={selectedStaffId === ""} onClick={() => onPick("")}>
        Dowolny
      </StaffChip>
      {staff.map((s) => (
        <StaffChip
          key={s.id}
          staff={s}
          selected={s.id === selectedStaffId}
          dimmed={unavailableForStaffId?.(s.id) ?? false}
          onClick={() => onPick(s.id)}
        />
      ))}
    </div>
  );
}
