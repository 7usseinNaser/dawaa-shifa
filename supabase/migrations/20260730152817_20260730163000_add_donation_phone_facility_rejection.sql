/*
# Add donor_phone and recipient_facility_id to medicine_donations

1. Modified Tables
- `medicine_donations`: add `donor_phone` (text, nullable) to capture donor contact info.
  add `recipient_facility_id` (uuid, nullable, references facilities) to route donations to medical facilities.
  add `rejection_reason` (text, nullable) to store admin rejection notes.
  add `distributed_at` (timestamptz, nullable) to record distribution timestamp.

2. Security
- No policy changes needed; existing policies already cover these columns.
*/

ALTER TABLE medicine_donations ADD COLUMN IF NOT EXISTS donor_phone text DEFAULT '';
ALTER TABLE medicine_donations ADD COLUMN IF NOT EXISTS recipient_facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL;
ALTER TABLE medicine_donations ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE medicine_donations ADD COLUMN IF NOT EXISTS distributed_at timestamptz;
