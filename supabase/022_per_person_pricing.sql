-- Services billed per head, with a minimum group size.
--
-- A birthday workshop is not priced like a haircut: the studio charges per
-- child and will not run the room for fewer than five. Until now the booking
-- form asked for a name, a phone and nothing else, so a parent could book a
-- party without saying how many children are coming — the one number the
-- studio needs before it can say yes.
--
-- Every column is opt-in and null by default, so a tenant that never sets them
-- sees exactly the form it saw before. Nothing about the barbershop changes.
alter table services add column if not exists price_per_person boolean not null default false;
alter table services add column if not exists participants_min integer;
alter table services add column if not exists participants_label text;
-- One extra short question the service needs answered — "Wiek dzieci" for a
-- workshop, blank for everything else. Generic on purpose: the alternative was
-- a column per prospect.
alter table services add column if not exists extra_question_label text;

alter table services add constraint services_participants_min_range
  check (participants_min is null or participants_min between 1 and 100);

alter table bookings add column if not exists participants integer;
alter table bookings add constraint bookings_participants_range
  check (participants is null or participants between 1 and 500);
