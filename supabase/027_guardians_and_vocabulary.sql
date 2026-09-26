-- Two things the pracownia exposed: who the client is, and what to call them.

-- ── A client can belong to a guardian ──────────────────────────────────────
--
-- The sign-up asks for the parent's name and phone and then throws the parent
-- away: the booking keeps the child's name, and "Klienci" ends up listing
-- children with a number that belongs to somebody else. Nobody can see whose.
--
-- A child is a client like any other — it attends, it holds a karnet, it has a
-- history — it just is not the person you call. So it points at the one who
-- is. One parent, several children, which is the normal case and was
-- impossible to express before.
alter table customers add column if not exists guardian_id uuid
  references customers(id) on delete set null;

create index if not exists customers_guardian_idx
  on customers (tenant_id, guardian_id) where guardian_id is not null;

-- A child shares its guardian's number, so the phone can no longer be unique
-- across the whole tenant — three siblings would fight over one row. It stays
-- unique among the people who are actually reachable at it.
drop index if exists customers_tenant_phone_key;
create unique index if not exists customers_tenant_phone_key
  on customers (tenant_id, phone) where guardian_id is null;

-- ── What this business calls the people it teaches ─────────────────────────
--
-- "Dopisz dziecko" is right for a pracownia plastyczna and wrong for a dance
-- school for adults, and it was written into the forms, the buttons and the
-- note text alike. These are whole labels rather than a noun to decline: the
-- pattern already works for participants_label ("Liczba dzieci") and Polish
-- does not survive a system that tries to inflect a stored word.
--
-- NULL everywhere means the neutral wording, so nothing changes for a service
-- that never sets them.
alter table services add column if not exists enrollee_label text;
alter table services add column if not exists guardian_label text;
alter table services add column if not exists enroll_action_label text;

-- One word for the whole panel: the tab, the section on the booking page, the
-- heading. "Zajęcia" for a studio, "Treningi" for a gym, "Kursy" for a school.
alter table settings add column if not exists classes_label text;
