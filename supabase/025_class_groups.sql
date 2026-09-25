-- Recurring class groups: the other way a business sells time.
--
-- Everything WHEN does today assumes one customer takes one slot and the slot
-- is then gone. A pracownia plastyczna works the other way round: "poniedziałek
-- 15:45, dzieci 6–10" is a fixed position in the week that many children join,
-- and a booking that emptied it would be the bug.
--
-- The course itself stays an ordinary service — it already carries the name,
-- the description, how long one meeting runs, the price of a month and how
-- many meetings that month holds (`total_lessons`). A group adds only the two
-- things a service cannot express: when in the week it meets, and how many
-- people fit.
--
-- So one service, several groups: "Zajęcia 6–10 lat" meets on Monday, Tuesday,
-- Thursday and Friday, and a child joins one of them.
create table if not exists class_groups (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id)  on delete cascade,
  service_id  uuid not null references services(id) on delete cascade,
  slug        text not null,
  -- 0 = niedziela … 6 = sobota, same as business_hours.day_of_week.
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  -- Below this the group does not run yet: the widget says "zbieramy grupę"
  -- rather than refusing the sign-up, because the sign-up is how it fills.
  min_participants integer check (min_participants is null or min_participants between 1 and 100),
  -- NULL means the room decides, not the software. A pracownia that has never
  -- counted seats should not be made to invent a number.
  max_participants integer check (max_participants is null or max_participants between 1 and 200),
  -- "6–10 lat", "11–15 lat". Free text: the bracket is a label on a poster,
  -- not something the system should police at sign-up.
  age_label   text,
  note        text,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, slug),
  check (end_time > start_time)
);

create index if not exists class_groups_tenant_idx
  on class_groups (tenant_id, active, day_of_week, start_time);

-- Same as every other table here: RLS on, no policies. The app goes through
-- the service role, which bypasses it; the anon key ships in the browser
-- bundle and must not reach this.
alter table class_groups enable row level security;

-- ── A booking can be one meeting of a group ────────────────────────────────
-- Nullable: everything booked so far is unchanged. ON DELETE SET NULL, not
-- CASCADE: retiring a group must not erase the meetings that already happened.
alter table bookings add column if not exists class_group_id uuid
  references class_groups(id) on delete set null;

-- Seats taken on a date are counted from this index.
create index if not exists bookings_class_group_idx
  on bookings (class_group_id, starts_at) where class_group_id is not null;

-- ── One question a service asks from a list ────────────────────────────────
-- The birthday workshop needs a theme, and the studio has sixteen of them plus
-- "anything else you can think of". A column per prospect is how a product
-- rots, so this is the generic pair: what to ask, and what to offer.
alter table services add column if not exists extra_choice_label text;
alter table services add column if not exists extra_choices text[];
