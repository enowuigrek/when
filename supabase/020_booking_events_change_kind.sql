-- What a move actually changed: 'time', 'staff', or 'both'.
--
-- One drag can change the hour, the person, or both at once, and calling all
-- three "zmiana terminu" is wrong for two of them. It cannot be derived from
-- the row: the event stores the new time but never the old one, so an event
-- where only the staff member changed looks exactly like one where the hour
-- did. Null on the rows written before this existed — they are all plain
-- time changes, which is what the reader falls back to.
alter table booking_events add column if not exists change_kind text;

alter table booking_events add constraint booking_events_change_kind_check
  check (change_kind is null or change_kind in ('time', 'staff', 'both'));
