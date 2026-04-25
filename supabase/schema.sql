-- when? — barber demo schema
-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ---------- TABLES ----------

create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  duration_min integer not null check (duration_min > 0),
  price_pln    integer not null check (price_pln >= 0),
  sort_order   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 0=Sunday ... 6=Saturday (matches JS Date.getDay())
create table if not exists business_hours (
  day_of_week  smallint primary key check (day_of_week between 0 and 6),
  open_time    time,
  close_time   time,
  closed       boolean not null default false
);

create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  service_id      uuid not null references services(id) on delete restrict,
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          text not null default 'confirmed' check (status in ('confirmed','cancelled','completed','no_show')),
  notes           text,
  created_at      timestamptz not null default now(),
  constraint ends_after_starts check (ends_at > starts_at)
);

create index if not exists bookings_starts_at_idx on bookings (starts_at);
create index if not exists bookings_status_idx on bookings (status);

-- Prevent overlapping confirmed bookings (single chair MVP)
create extension if not exists btree_gist;
alter table bookings drop constraint if exists no_overlap_confirmed;
alter table bookings add constraint no_overlap_confirmed
  exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed');

-- ---------- RLS ----------

alter table services       enable row level security;
alter table business_hours enable row level security;
alter table bookings       enable row level security;

-- Services & hours: public read
drop policy if exists services_read on services;
create policy services_read on services for select using (active = true);

drop policy if exists hours_read on business_hours;
create policy hours_read on business_hours for select using (true);

-- Bookings: anyone can insert (public booking form), nobody can read via anon
-- Owner panel will use the service-role key (bypasses RLS).
drop policy if exists bookings_insert on bookings;
create policy bookings_insert on bookings for insert with check (status = 'confirmed');

-- ---------- SEED ----------

insert into business_hours (day_of_week, open_time, close_time, closed) values
  (0, null,    null,    true),   -- Sunday closed
  (1, '10:00', '19:00', false),
  (2, '10:00', '19:00', false),
  (3, '10:00', '19:00', false),
  (4, '10:00', '19:00', false),
  (5, '10:00', '19:00', false),
  (6, '09:00', '15:00', false)   -- Saturday short
on conflict (day_of_week) do nothing;

insert into services (slug, name, description, duration_min, price_pln, sort_order) values
  ('strzyzenie',    'Strzyżenie męskie',    'Klasyczne strzyżenie maszynką i nożyczkami, mycie, stylizacja.', 30, 60,  1),
  ('broda',         'Modelowanie brody',    'Przycięcie i konturowanie brody, ciepły kompres, balsam.',        30, 50,  2),
  ('combo',         'Strzyżenie + broda',   'Pełen pakiet: włosy + broda. Najpopularniejsza opcja.',           60, 100, 3),
  ('dziecko',       'Strzyżenie dziecięce', 'Do 12 roku życia. Spokojnie, bez pośpiechu.',                     30, 45,  4),
  ('ojciec-syn',    'Ojciec + syn',         'Dwie osoby na raz, przy dwóch krzesłach.',                        45, 90,  5)
on conflict (slug) do nothing;
