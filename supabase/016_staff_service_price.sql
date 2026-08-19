-- Per-person price for a service.
--
-- Pricing overrides existed only through staff groups: make a "Premium" group,
-- put someone in it, set a price for the service in that group. That pays off
-- when several people share a rate and you re-price them together, and it is
-- pure overhead when one stylist simply charges more for one cut.
--
-- The override lives on the row that already says "this person does this
-- service". NULL means the group price applies, or the base price if there is
-- no group. Resolution order: staff → group → base.

alter table staff_services
  add column if not exists price_pln    integer,
  add column if not exists duration_min integer;

alter table staff_services
  drop constraint if exists staff_services_price_positive,
  add constraint staff_services_price_positive
    check (price_pln is null or price_pln >= 0);

alter table staff_services
  drop constraint if exists staff_services_duration_positive,
  add constraint staff_services_duration_positive
    check (duration_min is null or duration_min > 0);
