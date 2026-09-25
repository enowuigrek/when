-- Longer steps between start times.
--
-- The list stopped at 30 minutes, which fits a salon booking half-hour
-- appointments and nothing else. A pracownia running two-hour birthday
-- workshops wants starts at 11:00 and 14:00 — not every half hour in between,
-- each one greyed out because it collides with the party either side.
--
-- Only adds values; every existing tenant keeps the granularity it had.
alter table settings drop constraint if exists settings_slot_granularity_min_check;
alter table settings add constraint settings_slot_granularity_min_check
  check (slot_granularity_min = any (array[5, 10, 15, 20, 30, 45, 60, 90, 120, 180]));
