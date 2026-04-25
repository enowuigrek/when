-- when? — business settings & time filters
-- Run in Supabase SQL Editor after schema.sql

-- ---------- SETTINGS (single row) ----------

create table if not exists settings (
  id                    integer primary key default 1
                        check (id = 1), -- enforces single row
  business_name         text not null default 'Mój Salon',
  tagline               text,
  description           text,
  address_street        text,
  address_city          text,
  address_postal        text,
  phone                 text,
  email                 text,
  instagram_url         text,
  maps_url              text,
  logo_url              text,   -- Supabase Storage public URL
  slot_granularity_min  integer not null default 15
                        check (slot_granularity_min in (5,10,15,20,30)),
  booking_horizon_days  integer not null default 21
                        check (booking_horizon_days between 1 and 90),
  updated_at            timestamptz not null default now()
);

-- Seed with Brzytwa demo data (editable via admin panel)
insert into settings (
  id, business_name, tagline, description,
  address_street, address_city, address_postal,
  phone, email, instagram_url, maps_url,
  slot_granularity_min, booking_horizon_days
) values (
  1,
  'Brzytwa',
  'Klasyka i precyzja. Bez pośpiechu.',
  'Barber shop dla mężczyzn, którzy wiedzą czego chcą. Strzyżenie, broda, pełen rytuał.',
  'ul. Mokra 12', 'Wrocław', '50-001',
  '+48 600 100 200',
  'kontakt@brzytwa.pl',
  'https://instagram.com/brzytwa',
  'https://maps.google.com/?q=ul.+Mokra+12,+Wrocław',
  15, 21
)
on conflict (id) do nothing;

-- ---------- TIME FILTERS ----------

create table if not exists time_filters (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  from_hour   smallint not null check (from_hour between 0 and 23),
  to_hour     smallint not null check (to_hour between 1 and 24),
  sort_order  integer not null default 0,
  active      boolean not null default true,
  constraint valid_range check (to_hour > from_hour)
);

-- Default filters (editable by admin)
insert into time_filters (label, from_hour, to_hour, sort_order) values
  ('Rano',        6,  12, 1),
  ('Południe',   12,  15, 2),
  ('Popołudnie', 15,  18, 3),
  ('Wieczór',    18,  23, 4)
on conflict do nothing;

-- ---------- RLS ----------

alter table settings     enable row level security;
alter table time_filters enable row level security;

-- Public read (landing page needs settings)
create policy settings_read     on settings     for select using (true);
create policy time_filters_read on time_filters for select using (active = true);
-- Writes go through service-role key (admin panel) — bypasses RLS.
