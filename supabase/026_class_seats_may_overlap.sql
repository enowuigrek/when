-- A class is many children at one hour, which is what the schedule forbade.
--
-- Two exclusion constraints keep a chair or a person from being double-booked:
-- no two confirmed bookings may overlap for the same staff member, and no two
-- may overlap with nobody assigned. Both are right for an appointment and
-- exactly backwards for a group — signing up a second child for Monday 15:45
-- was refused by the database as a double booking.
--
-- Seats in a recurring group are taken out of both. Capacity there is not "one
-- at a time"; it is the group's own max_participants, checked when the sign-up
-- is made, and a room that holds twelve should not be argued with by a
-- constraint written for a barber's chair.
--
-- Everything that is not a class keeps exactly the protection it had.
alter table bookings drop constraint if exists no_overlap_no_staff;
alter table bookings add constraint no_overlap_no_staff
  exclude using gist (
    tenant_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (staff_id is null and class_group_id is null and status = 'confirmed');

alter table bookings drop constraint if exists no_overlap_staff;
alter table bookings add constraint no_overlap_staff
  exclude using gist (
    tenant_id with =,
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (staff_id is not null and class_group_id is null and status = 'confirmed');
