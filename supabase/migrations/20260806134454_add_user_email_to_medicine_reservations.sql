-- Add user_email column to medicine_reservations for contact details popup
ALTER TABLE medicine_reservations ADD COLUMN IF NOT EXISTS user_email text;

-- Backfill user_email from the profiles table
UPDATE medicine_reservations r
SET user_email = p.email
FROM profiles p
WHERE r.user_id = p.id AND r.user_email IS NULL;
