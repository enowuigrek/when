-- Kiedy już wysłaliśmy maila o ruchu na demie.
--
-- Cron chodzi co godzinę i pyta „czy ktoś dziś tu był". Bez pamięci
-- wysyłałby to samo powiadomienie co godzinę aż do północy. Klucz na parze
-- (najemca, dzień) sprawia, że drugie wstawienie po prostu nic nie robi —
-- więc cron może chodzić choć co minutę i mail pójdzie raz.
--
-- Osobna tabela, a nie kolumna przy najemcy, bo to fakt o dniu, nie o
-- najemcy: jutro ma być wysłane znowu.
create table if not exists demo_visit_alerts (
  tenant_id uuid not null references tenants(id) on delete cascade,
  -- Dzień warszawski, nie UTC. O 23:30 w Warszawie jest jeszcze ten sam
  -- dzień roboczy, a w UTC już następny.
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (tenant_id, day)
);

alter table demo_visit_alerts enable row level security;
