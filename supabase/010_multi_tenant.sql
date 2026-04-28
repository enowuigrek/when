-- Multi-tenant. Adds tenants table + tenant_id to every domain table so we
-- can host the production "main" business alongside ephemeral demo tenants.
-- Demo cleanup is `delete from tenants where ...` and CASCADE wipes the rest.

-- ── Tenants ──────────────────────────────────────────────────────────────────
create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  kind        text not null default 'main' check (kind in ('main', 'demo')),
  variant     text,                    -- 'barber' | 'kosmetyka' for demos
  created_at  timestamptz not null default now(),
  expires_at  timestamptz                  -- null for 'main', set for demos
);

create index if not exists tenants_expires_idx on tenants(expires_at) where expires_at is not null;

alter table tenants enable row level security;
create policy "service_all_tenants" on tenants using (true) with check (true);

-- Seed the main tenant. Fixed UUID so application code can reference it.
insert into tenants (id, slug, name, kind)
values ('00000000-0000-0000-0000-000000000001', 'main', 'Brzytwa', 'main')
on conflict (id) do nothing;

-- Helper: id of the main tenant for backfill.
-- (We avoid a function — just inline the UUID literal.)

-- ── Add tenant_id to every domain table (nullable first, backfill, then NOT NULL) ─
alter table services          add column if not exists tenant_id uuid;
alter table business_hours    add column if not exists tenant_id uuid;
alter table bookings          add column if not exists tenant_id uuid;
alter table customers         add column if not exists tenant_id uuid;
alter table staff             add column if not exists tenant_id uuid;
alter table staff_services    add column if not exists tenant_id uuid;
alter table settings          add column if not exists tenant_id uuid;
alter table time_filters      add column if not exists tenant_id uuid;
alter table staff_schedules   add column if not exists tenant_id uuid;
alter table staff_time_off    add column if not exists tenant_id uuid;
alter table booking_events    add column if not exists tenant_id uuid;
alter table staff_groups      add column if not exists tenant_id uuid;
alter table staff_group_members  add column if not exists tenant_id uuid;
alter table service_group_prices add column if not exists tenant_id uuid;

-- Backfill all existing rows to the main tenant.
update services          set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update business_hours    set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update bookings          set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update customers         set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update staff             set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update staff_services    set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update settings          set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update time_filters      set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update staff_schedules   set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update staff_time_off    set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update booking_events    set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update staff_groups      set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update staff_group_members  set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update service_group_prices set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;

-- Now enforce NOT NULL + FK with CASCADE.
do $$
declare t text;
begin
  for t in select unnest(array[
    'services','business_hours','bookings','customers','staff','staff_services',
    'settings','time_filters','staff_schedules','staff_time_off','booking_events',
    'staff_groups','staff_group_members','service_group_prices'
  ])
  loop
    execute format('alter table %I alter column tenant_id set not null', t);
    execute format('alter table %I drop constraint if exists %I', t, t || '_tenant_fk');
    execute format(
      'alter table %I add constraint %I foreign key (tenant_id) references tenants(id) on delete cascade',
      t, t || '_tenant_fk'
    );
    execute format('create index if not exists %I on %I (tenant_id)', t || '_tenant_idx', t);
  end loop;
end $$;

-- ── Re-scope unique / PK / exclusion constraints to be per-tenant ────────────

-- services.slug must be unique only within a tenant.
alter table services drop constraint if exists services_slug_key;
drop index if exists services_slug_key;
create unique index if not exists services_tenant_slug_key on services(tenant_id, slug);

-- customers.phone must be unique only within a tenant.
drop index if exists customers_phone_key;
create unique index if not exists customers_tenant_phone_key on customers(tenant_id, phone);

-- settings: drop the single-row check + PK on id, repurpose PK to tenant_id.
alter table settings drop constraint if exists settings_id_check;
alter table settings drop constraint if exists settings_pkey;
-- keep id column for now (legacy), but PK becomes tenant_id.
alter table settings add constraint settings_tenant_pk primary key (tenant_id);

-- business_hours: PK was day_of_week alone, now (tenant_id, day_of_week).
alter table business_hours drop constraint if exists business_hours_pkey;
alter table business_hours add constraint business_hours_pkey primary key (tenant_id, day_of_week);

-- staff_schedules PK: extend to include tenant_id for safety.
alter table staff_schedules drop constraint if exists staff_schedules_pkey;
alter table staff_schedules add constraint staff_schedules_pkey primary key (tenant_id, staff_id, day_of_week);

-- bookings overlap exclusion: scope by tenant. Drop existing two and recreate.
do $$
declare cname text;
begin
  for cname in
    select conname from pg_constraint
    where conrelid = 'bookings'::regclass and contype = 'x'
  loop
    execute format('alter table bookings drop constraint %I', cname);
  end loop;
end $$;

-- Same chair (no staff): no overlap within tenant.
alter table bookings add constraint no_overlap_no_staff
  exclude using gist (
    tenant_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (staff_id is null and status = 'confirmed');

-- Same staff: no overlap within tenant (staff_id alone is unique across tenants
-- but constraint includes tenant_id for clarity / index efficiency).
alter table bookings add constraint no_overlap_staff
  exclude using gist (
    tenant_id with =,
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (staff_id is not null and status = 'confirmed');

-- ── Helpful indexes for tenant-scoped queries ────────────────────────────────
create index if not exists bookings_tenant_starts_idx on bookings(tenant_id, starts_at);
create index if not exists booking_events_tenant_created_idx on booking_events(tenant_id, created_at desc);
