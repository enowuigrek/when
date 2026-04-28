-- Group classes support
alter table services
  add column if not exists is_group boolean not null default false,
  add column if not exists max_participants integer check (max_participants is null or max_participants >= 1);
