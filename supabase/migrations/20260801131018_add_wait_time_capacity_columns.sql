/*
# Add wait-time and capacity columns to departments and facilities

1. Modified Tables
- `departments`: add three columns:
  - `current_queue_count` (integer, default 0): number of people currently waiting in this department's queue.
  - `avg_service_time_minutes` (integer, default 15): average time to serve one patient, in minutes. Set by facility owner.
  - `department_capacity` (integer, default 20): maximum number of people the department can hold at once.

- `facilities`: add one column:
  - `facility_capacity` (integer, default 100): maximum total occupancy for the facility as a whole. Set by facility owner.

2. Security
- No RLS policy changes — existing policies remain in effect.
- The new columns inherit the same CRUD access as their parent tables.

3. Notes
- All columns are additive with safe defaults, so existing data and queries are unaffected.
- The frontend will use these to calculate: expected wait time = current_queue_count × avg_service_time_minutes.
- Occupancy rate = current_queue_count / department_capacity × 100.
- Facility-level occupancy = sum of all department queue counts / facility_capacity × 100.
*/
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'current_queue_count') THEN
    ALTER TABLE departments ADD COLUMN current_queue_count integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'avg_service_time_minutes') THEN
    ALTER TABLE departments ADD COLUMN avg_service_time_minutes integer NOT NULL DEFAULT 15;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'department_capacity') THEN
    ALTER TABLE departments ADD COLUMN department_capacity integer NOT NULL DEFAULT 20;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'facility_capacity') THEN
    ALTER TABLE facilities ADD COLUMN facility_capacity integer NOT NULL DEFAULT 100;
  END IF;
END $$;
