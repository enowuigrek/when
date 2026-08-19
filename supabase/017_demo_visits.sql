-- Did anyone open the demo we sent, and did they look around?
--
-- Deliberately anonymous: no cookie, no localStorage, no session id, no IP.
-- One row per page view — tenant, path, timestamp. That is enough to answer
-- both questions (any rows at all = somebody opened it; several distinct paths
-- = they clicked around) and it stores nothing about a person, so it needs no
-- consent banner and carries no personal data to look after.

create table if not exists demo_visits (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  path       text not null,
  at         timestamptz not null default now()
);

create index if not exists demo_visits_tenant_at_idx on demo_visits (tenant_id, at desc);

-- Same shape as every other table here: RLS on, no policies. The app writes
-- through the service role, which bypasses RLS; the anon key ships in the
-- browser bundle, and without this it could read and — worse — write rows,
-- letting anyone pollute the demo statistics.
alter table demo_visits enable row level security;
