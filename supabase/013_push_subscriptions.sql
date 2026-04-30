-- Push notification subscriptions for owner PWA
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  -- One endpoint per tenant (upsert by endpoint)
  unique (tenant_id, endpoint)
);

alter table push_subscriptions enable row level security;
-- Admin client (service role) has full access — no RLS policy needed
