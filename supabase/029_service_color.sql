-- Every class gets its own colour.
--
-- A studio with three courses reads its week by course, and the schedule, the
-- classes page and every calendar drew all of them in the one accent — so a
-- Monday with two groups was one tinted day and the grid was a stack of
-- identical blocks. The pracownia is called Tęczówka; a colour per course is
-- the obvious way to tell them apart.
--
-- Chosen from a fixed palette in the app (lib/class-colors.ts), stored as the
-- hex itself so nothing breaks if the palette is reordered. NULL means "not
-- chosen": the app picks one from the course's position in the list.
alter table services add column if not exists color text;

alter table services drop constraint if exists services_color_check;
alter table services add constraint services_color_check
  check (color is null or color ~ '^#[0-9a-fA-F]{6}$');
