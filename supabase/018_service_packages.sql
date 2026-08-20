-- Packages: a service sold as N lessons for one price.
--
-- A dance school sells "Pierwszy taniec weselny — 5 lekcji, 840 zł". Until now
-- the only way to express that was to invent a per-lesson price, which is not
-- what the school charges and shows the customer no progress through what they
-- bought.
--
-- The lesson itself stays exactly what it was: an ordinary booking, one block
-- of time, its own duration. The only new thing is which package it belongs to.

-- ── The service says how many lessons a package holds ──────────────────────
-- NULL means "not a package" — every existing service keeps behaving as it did.
-- The lesson's default length stays in services.duration_min: that column
-- already means "how long one appointment is", it is what slot computation
-- reads, and a second column for the same idea would be two sources of truth
-- for the one number that decides whether a booking fits.
alter table services add column if not exists total_lessons integer;

alter table services drop constraint if exists services_total_lessons_range;
alter table services add constraint services_total_lessons_range
  check (total_lessons is null or total_lessons between 2 and 100);

-- ── One purchase of a package by one customer ──────────────────────────────
create table if not exists service_packages (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id)   on delete cascade,
  service_id    uuid not null references services(id)  on delete cascade,
  customer_id   uuid not null references customers(id) on delete cascade,
  -- Copied from the service at purchase, then editable: the school may throw in
  -- an extra lesson, and re-pricing the service later must not rewrite what a
  -- customer already bought.
  total_lessons integer not null check (total_lessons between 1 and 100),
  status        text    not null default 'active'
                  check (status in ('active', 'completed', 'cancelled')),
  created_at    timestamptz not null default now()
);

create index if not exists service_packages_tenant_customer_idx
  on service_packages (tenant_id, customer_id);

-- Finding the open package to attach the next lesson to.
create index if not exists service_packages_open_idx
  on service_packages (tenant_id, customer_id, service_id)
  where status = 'active';

-- Same as every other table here: RLS on, no policies. The app goes through the
-- service role, which bypasses it; the anon key ships in the browser bundle and
-- must not reach this.
alter table service_packages enable row level security;

-- ── A booking can belong to a package ──────────────────────────────────────
-- Nullable: a booking that is not part of a package is unchanged.
-- ON DELETE SET NULL, not CASCADE: cancelling a package must not silently erase
-- appointments that already happened.
alter table bookings add column if not exists package_id uuid
  references service_packages(id) on delete set null;

create index if not exists bookings_package_idx
  on bookings (package_id) where package_id is not null;
