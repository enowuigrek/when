-- Some courses are not signed up for, they are asked about.
--
-- The pracownia's drawing course prepares candidates for art school. Its page
-- lists a day and an hour and no price at all, because what it costs and how
-- it is paid for is settled in a conversation. A sign-up button there would
-- invent a commercial model on the studio's behalf, and a made-up price on a
-- demo sent to the owner is the worst kind of mistake to make.
--
-- So a service says how it is joined. 'self' is everything as it was — the
-- parent books. 'enquiry' shows the timetable and a way to get in touch.
alter table services add column if not exists enroll_mode text not null default 'self';

alter table services drop constraint if exists services_enroll_mode_check;
alter table services add constraint services_enroll_mode_check
  check (enroll_mode in ('self', 'enquiry'));
