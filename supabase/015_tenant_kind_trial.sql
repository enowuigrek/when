-- 015: tenant kinds for the prospect → customer funnel
--
-- Widens tenants.kind beyond ('main', 'demo').
--
--   trial    — account pre-provisioned for a named prospect. Reachable through
--              /demo/{slug} exactly like a demo, but never auto-deleted: the
--              cleanup cron filters on kind = 'demo', so a trial is safe to
--              hold real bookings if the prospect starts using it before
--              paying. Converting to a paying account means flipping kind and
--              setting credentials — no data migration.
--
--   customer — paying account. Already referenced by TypeScript
--              (getAdminTenantKind) but the old constraint rejected it, so no
--              row could ever have used it.
--
-- Purely additive: widening an allowed-value CHECK cannot invalidate rows
-- that already satisfy the narrower one.

alter table tenants drop constraint if exists tenants_kind_check;

alter table tenants
  add constraint tenants_kind_check
  check (kind in ('main', 'demo', 'trial', 'customer'));
