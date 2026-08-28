-- Remove every RLS policy. RLS stays on; with no policy, the anon and
-- authenticated roles can read and write nothing.
--
-- Why this is safe: the application never talks to PostgREST with the
-- publishable key. `lib/supabase/admin.ts` (service role, `server-only`) is
-- the single data path, and the service role bypasses RLS. The one file that
-- builds a client from the publishable key, `lib/supabase/server.ts`, is not
-- imported anywhere, and admin login is a custom cookie session rather than
-- Supabase Auth — so the `authenticated` role is never assumed either.
--
-- Why it had to go: the policies were written for role `public`, which
-- includes `anon`, and `anon` holds full DML grants on these tables. Six of
-- them read `USING (true) WITH CHECK (true)` for ALL commands. On `tenants`
-- that meant anyone holding the publishable key — a key designed to be public
-- — could list every client with their email, and delete rows that cascade
-- into bookings, customers and services. Verified by querying
-- /rest/v1/tenants with the publishable key: it returned every tenant.
--
-- The read-only policies on services, staff, settings, business_hours,
-- staff_services and time_filters exposed only what the public booking page
-- shows anyway, but nothing reads them through PostgREST, so they go too
-- rather than sit as a standing invitation.

drop policy if exists service_all_tenants on tenants;
drop policy if exists service_all_schedules on staff_schedules;
drop policy if exists service_all_staff_groups on staff_groups;
drop policy if exists service_all_staff_group_members on staff_group_members;
drop policy if exists service_all_time_off on staff_time_off;
drop policy if exists service_all_service_group_prices on service_group_prices;

drop policy if exists bookings_insert on bookings;

drop policy if exists services_read on services;
drop policy if exists staff_public_read on staff;
drop policy if exists settings_read on settings;
drop policy if exists hours_read on business_hours;
drop policy if exists staff_services_read on staff_services;
drop policy if exists time_filters_read on time_filters;
