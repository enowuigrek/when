create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  name text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists customers_phone_key on customers(phone);
create index if not exists customers_phone_search on customers(phone text_pattern_ops);
alter table customers enable row level security;

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  photo_url text,
  color text not null default '#d4a26a',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table staff enable row level security;
create policy staff_public_read on staff for select using (active = true);

create table if not exists staff_services (
  staff_id uuid not null references staff(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (staff_id, service_id)
);
alter table staff_services enable row level security;
create policy staff_services_read on staff_services for select using (true);

alter table bookings add column if not exists staff_id uuid references staff(id) on delete set null;

DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'bookings'::regclass AND contype = 'x' LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE bookings ADD EXCLUDE USING GIST (
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (staff_id IS NULL AND status = 'confirmed');

ALTER TABLE bookings ADD EXCLUDE USING GIST (
  staff_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (staff_id IS NOT NULL AND status = 'confirmed');

insert into staff (name, bio, color, sort_order) values
  ('Marek', 'Klasyczne strzyżenia i golenie brzytwą.', '#d4a26a', 1),
  ('Piotr', 'Nowoczesne stylizacje i brodowanie.', '#6ab0d4', 2)
on conflict do nothing;
