-- Ensure no_show is allowed in the status check constraint.
-- If the constraint already includes no_show this is a no-op pattern.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show'));
