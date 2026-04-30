-- Faza 1: płatności i depozyty

-- 1. Payment config per service
alter table services
  add column if not exists payment_mode text not null default 'none'
    check (payment_mode in ('none', 'deposit', 'full')),
  add column if not exists deposit_amount_pln integer default null;
  -- null deposit_amount → use full price_pln as deposit

-- 2. Payment tracking on bookings
alter table bookings
  add column if not exists payment_status text default null
    check (payment_status in ('pending', 'paid', 'refunded')),
  add column if not exists tpay_transaction_id text default null;

-- 3. Allow pending_payment booking status
--    Drop old check constraint (if it exists) and recreate with new value
do $$
begin
  alter table bookings drop constraint if exists bookings_status_check;
exception when others then null;
end $$;

alter table bookings
  add constraint bookings_status_check
  check (status in ('confirmed', 'cancelled', 'completed', 'no_show', 'pending_payment'));

-- 4. Index for fast lookup by tpay transaction id
create index if not exists bookings_tpay_transaction_id_idx
  on bookings (tpay_transaction_id)
  where tpay_transaction_id is not null;

-- 5. Index for cron cleanup of stale pending_payment bookings
create index if not exists bookings_pending_payment_idx
  on bookings (status, created_at)
  where status = 'pending_payment';
