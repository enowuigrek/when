-- One drag across the schedule can change the hour and the person at once, and
-- that is one piece of news, not two. The event needs somewhere to say who the
-- booking moved to.
--
-- Nullable and only filled when the staff member actually changed: a plain
-- time change should not repeat a name nobody asked about. Denormalised like
-- customer_name and service_name already are — an event is a record of what
-- was said at the time, and must not change later because a staff member was
-- renamed or removed.
alter table booking_events add column if not exists staff_name text;
