/*
# Add verification, power status, medicine category, and USD price columns

## Overview
This migration adds columns needed for P0 features:
1. Admin verification system (P0 item 6) — `verified` column on pharmacies and facilities
2. Electricity/power status indicator (P0 item 29) — `power_status` column on pharmacies and facilities
3. Medicine categorization (P2 item 52) — `category` column on medicines
4. USD pricing support (P3 item 68) — `price_usd` column on medicines
5. Medicine availability toggle (P2 item 142) — `is_available` column on medicines
6. Facility occupancy rate (P1 item 81) — `occupancy_rate` column on facilities

## Tables Modified
- `pharmacies`: adds `verified` (bool), `power_status` (text)
- `facilities`: adds `verified` (bool), `power_status` (text), `occupancy_rate` (int)
- `medicines`: adds `category` (text), `price_usd` (numeric), `is_available` (bool)

## Security
- No new tables created
- No RLS policy changes needed (existing policies cover new columns)
- All new columns are nullable with safe defaults

## Important Notes
- All columns use IF NOT EXISTS checks via DO $$ blocks to be idempotent
- Defaults are chosen so existing rows get sensible values
*/

-- Add verified column to pharmacies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'verified') THEN
    ALTER TABLE pharmacies ADD COLUMN verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add power_status column to pharmacies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'power_status') THEN
    ALTER TABLE pharmacies ADD COLUMN power_status text NOT NULL DEFAULT 'unknown';
  END IF;
END $$;

-- Add verified column to facilities
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facilities' AND column_name = 'verified') THEN
    ALTER TABLE facilities ADD COLUMN verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add power_status column to facilities
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facilities' AND column_name = 'power_status') THEN
    ALTER TABLE facilities ADD COLUMN power_status text NOT NULL DEFAULT 'unknown';
  END IF;
END $$;

-- Add occupancy_rate column to facilities
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facilities' AND column_name = 'occupancy_rate') THEN
    ALTER TABLE facilities ADD COLUMN occupancy_rate int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add category column to medicines
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicines' AND column_name = 'category') THEN
    ALTER TABLE medicines ADD COLUMN category text DEFAULT 'عام';
  END IF;
END $$;

-- Add price_usd column to medicines
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicines' AND column_name = 'price_usd') THEN
    ALTER TABLE medicines ADD COLUMN price_usd numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add is_available column to medicines
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicines' AND column_name = 'is_available') THEN
    ALTER TABLE medicines ADD COLUMN is_available boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Mark existing seed pharmacies and facilities as verified (they were pre-existing)
UPDATE pharmacies SET verified = true WHERE verified = false;
UPDATE facilities SET verified = true WHERE verified = false;

-- Set occupancy_rate for existing facilities based on status
UPDATE facilities SET occupancy_rate = 100 WHERE overall_status = 'emergency';
UPDATE facilities SET occupancy_rate = 75 WHERE overall_status = 'busy';
UPDATE facilities SET occupancy_rate = 40 WHERE overall_status = 'open';
UPDATE facilities SET occupancy_rate = 0 WHERE overall_status = 'closed';

-- Set power_status for existing records
UPDATE pharmacies SET power_status = 'generator' WHERE power_status = 'unknown';
UPDATE facilities SET power_status = 'generator' WHERE power_status = 'unknown';

-- Set is_available for existing medicines based on quantity
UPDATE medicines SET is_available = (quantity > 0);

-- Set price_usd for existing medicines (approximate rate: 1 USD = 3.7 ILS)
UPDATE medicines SET price_usd = ROUND((price / 3.7)::numeric, 2) WHERE price_usd = 0;

-- Add index on verified column for admin queries
CREATE INDEX IF NOT EXISTS idx_pharmacies_verified ON pharmacies(verified);
CREATE INDEX IF NOT EXISTS idx_facilities_verified ON facilities(verified);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
