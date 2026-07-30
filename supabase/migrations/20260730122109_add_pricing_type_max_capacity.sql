/*
# Add pricing_type and max_capacity to facilities

1. Modified Tables
- `facilities`: add `pricing_type` text column (values: 'free', 'paid', 'nominal'), default 'free'
- `facilities`: add `max_capacity` integer column, default 0 (0 = unset)

2. Notes
- `pricing_type` gives finer granularity than the existing `is_free` boolean:
  'free' = مجاني, 'paid' = مدفوع, 'nominal' = مدفوع بأسعار رمزية
- `max_capacity` enables real occupancy calculation:
  occupancy% = (total waiting across departments / max_capacity) * 100
- Both columns are nullable-safe with sensible defaults so existing rows are unaffected.
- No RLS policy changes needed — existing policies already cover the new columns.
*/

ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL DEFAULT 'free';

ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS max_capacity integer NOT NULL DEFAULT 0;
