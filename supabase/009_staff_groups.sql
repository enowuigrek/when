-- Staff groups for per-group service pricing.

create table if not exists staff_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists staff_group_members (
  staff_id uuid not null references staff(id) on delete cascade,
  group_id uuid not null references staff_groups(id) on delete cascade,
  primary key (staff_id, group_id)
);

create table if not exists service_group_prices (
  service_id uuid not null references services(id) on delete cascade,
  group_id uuid not null references staff_groups(id) on delete cascade,
  price_pln int not null,
  duration_min int,
  primary key (service_id, group_id)
);

create index if not exists staff_group_members_group_idx on staff_group_members(group_id);
create index if not exists service_group_prices_group_idx on service_group_prices(group_id);

-- Snapshot the effective price (and duration) at booking time so historic
-- records remain stable if overrides change later. Nullable = use service base.
alter table bookings add column if not exists price_pln_snapshot int;
alter table bookings add column if not exists duration_min_snapshot int;

-- RLS — admin access uses service role key which bypasses RLS, but Supabase
-- requires it to be enabled on every table. Permissive policy mirrors the
-- pattern used by staff_schedules / booking_events.
alter table staff_groups          enable row level security;
alter table staff_group_members   enable row level security;
alter table service_group_prices  enable row level security;

create policy "service_all_staff_groups"          on staff_groups          using (true) with check (true);
create policy "service_all_staff_group_members"   on staff_group_members   using (true) with check (true);
create policy "service_all_service_group_prices"  on service_group_prices  using (true) with check (true);
