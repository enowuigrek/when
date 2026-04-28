-- Per-tenant auth credentials.
-- email is unique (ignoring NULLs — main tenant may have no email initially).
-- password_hash uses scrypt via Node.js crypto (format: "{salt}:{hash}").

alter table tenants add column if not exists email text;
alter table tenants add column if not exists password_hash text;

create unique index if not exists tenants_email_key
  on tenants(email) where email is not null;
