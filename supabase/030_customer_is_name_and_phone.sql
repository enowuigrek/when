-- Guardians were a layer too many. A client is a name and a number.
--
-- The sign-up asked for the child and the parent and stored both: the child
-- as a client with a guardian_id, the parent as a client of their own. It
-- answered a real question — whose phone number is this — and cost more than
-- it was worth. Two rows per sign-up, a phone unique only among the adults,
-- and a duplicate the first time somebody typed a number that was already in
-- the book: the parent row and the child row were both "sss" on 999000999,
-- indistinguishable in the list and each holding half the history.
--
-- So the person who attends is the client, full stop. Their number is where
-- the studio calls; whose phone it is stays a fact about the family, not a
-- row in the database.
--
-- Siblings are why the key is the pair. One number can belong to two
-- children, so a phone alone no longer identifies anybody — name and number
-- together do. That also stops the accident this replaces: entering a number
-- already in the book now lands on the person who has it, and a second child
-- on the same number is a second client rather than a rename of the first.
--
-- Merge duplicates before running this. It is deliberately not done here:
-- a migration that quietly deletes somebody's clients is worse than one that
-- refuses to run.
drop index if exists customers_tenant_phone_key;
drop index if exists customers_guardian_idx;
alter table customers drop column if exists guardian_id;

create unique index if not exists customers_tenant_person_key
  on customers (tenant_id, phone, lower(name));
