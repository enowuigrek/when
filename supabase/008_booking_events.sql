-- Booking events: append-only log feeding the admin notification bell.
-- Tracks 'created' (new booking), 'rescheduled' (customer changed time), 'cancelled'.

create table if not exists booking_events (
  id            uuid primary key default gen_random_uuid(),
  booking_id   uuid,
  event_type    text not null check (event_type in ('created', 'rescheduled', 'cancelled')),
  source        text not null check (source in ('customer', 'admin')),
  customer_name text not null,
  service_name  text,
  starts_at     timestamptz not null,
  created_at    timestamptz not null default now()
);

create index if not exists booking_events_created_at_idx on booking_events (created_at desc);

alter table booking_events enable row level security;

-- Admin client uses the service role key, which bypasses RLS, so no policies needed.
