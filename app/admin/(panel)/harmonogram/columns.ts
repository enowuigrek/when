/**
 * The schedule's pseudo-column for bookings with nobody assigned.
 *
 * Bookings taken before anyone was on the roster keep `staff_id = null`
 * forever. With no staff at all they get the single "Rezerwacje" column, but
 * the moment the first person is added the grid is built from the roster and
 * those bookings have no column to land in — they vanish from the schedule
 * while still counting in the day totals. They get their own column instead,
 * and only when there is something to put in it.
 *
 * Both the grid and the drag need to agree on this string, hence one home for
 * it rather than a copy on each side.
 */
export const UNASSIGNED_COLUMN = "__none__";

/**
 * The schedule's pseudo-column for recurring classes.
 *
 * A class is not somebody's appointment — it is a fixed position in the week
 * that the room keeps whether or not anyone has signed up. Giving it its own
 * column says that in the layout: the timetable on the left, people's
 * bookings beside it, and nothing about a class that invites being dragged.
 */
export const CLASS_COLUMN = "__class__";

export type ScheduleColumn = { id: string; name: string; color: string };

export const classColumn: ScheduleColumn = {
  id: CLASS_COLUMN,
  name: "Zajęcia",
  color: "var(--color-accent)",
};

const unassignedColumn: ScheduleColumn = {
  id: UNASSIGNED_COLUMN,
  name: "Bez pracownika",
  color: "var(--color-accent)",
};

/**
 * The single column a tenant with nobody on the roster gets for its ordinary
 * bookings. Normally implicit — the grid falls back to it when there are no
 * staff columns at all — but once the class column exists there is something
 * beside it, so it has to be named.
 */
export const bookingsColumn: ScheduleColumn = {
  id: UNASSIGNED_COLUMN,
  name: "Rezerwacje",
  color: "var(--color-accent)",
};

export function withUnassignedColumn(
  staff: ScheduleColumn[],
  bookings: { staff_id: string | null }[]
): ScheduleColumn[] {
  if (staff.length === 0) return staff;
  return bookings.some((b) => b.staff_id === null) ? [...staff, unassignedColumn] : staff;
}
