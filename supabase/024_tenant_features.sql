-- What a given tenant's WHEN actually has.
--
-- Every client so far pushed a new capability into the product, and every one
-- of them landed in everybody's panel: a barber got a "Pracownicy" tab he uses
-- for two people, a dance school got payment settings it does not take, and a
-- pracownia plastyczna would get all of it plus packages it half-needs. The
-- product grew into the union of every client, which is the one shape that
-- fits none of them.
--
-- So capabilities stay in the codebase and get switched on per tenant. This is
-- a list of names, not a table of flags: a new capability is a new string, not
-- a migration, and reading it is one array lookup rather than a join.
--
-- Known names (see lib/features.ts, which is the authority):
--   pracownicy      staff: the picker in the widget, the tab and the roster
--   grupy           recurring class groups and the weekly enrolment grid
--   (karnety, cena-od-osoby and platnosci were listed here at first and read
--    by nothing; see lib/features.ts for why they were dropped rather than
--    kept as promises. Retired names in this column are simply ignored.)
--
-- An unknown name is ignored rather than rejected: a half-deployed feature
-- must not take the tenant's panel down with it.
alter table tenants add column if not exists features text[] not null default '{}';

-- Existing tenants keep exactly the panel they have today. Payments are on for
-- everyone because the settings already exist and switching them off here
-- would hide a live Tpay configuration; packages likewise — the dance school
-- is mid-course.
update tenants
   set features = array['pracownicy', 'karnety', 'platnosci']
 where features = '{}';
