/*
# Soft Delete, Version History, Restricted Medicines, Admin Alerts

## Overview
Adds soft-delete (trash bin) support, entity version history (last 3 versions),
restricted/banned medicine flag, and an admin alerts/warnings system.

## Tables Modified
- `facilities` — add `deleted_at timestamptz` (null = active)
- `pharmacies` — add `deleted_at timestamptz`
- `medicines` — add `deleted_at timestamptz`, `is_restricted boolean DEFAULT false`, `restriction_note text`
- `profiles` — add `deleted_at timestamptz`, `banned boolean DEFAULT false`

## New Tables
- `entity_versions` — stores last 3 versions of facilities/medicines for rollback
  - `id` uuid PK
  - `entity_type` text (facility | medicine | pharmacy)
  - `entity_id` uuid
  - `snapshot` jsonb (full row snapshot)
  - `created_by` uuid
  - `created_at` timestamptz DEFAULT now()
- `admin_alerts` — warnings/alerts sent by admin to facility/pharmacy owners or broadcast
  - `id` uuid PK
  - `target_type` text (facility | pharmacy | broadcast)
  - `target_id` text (entity id or 'all')
  - `area` text (for area-scoped broadcasts, null = all)
  - `message` text
  - `severity` text (info | warning | emergency)
  - `created_by` uuid
  - `created_at` timestamptz DEFAULT now()

## Security
- RLS enabled on both new tables
- Admin-only INSERT on admin_alerts (is_admin check)
- Admin + owner SELECT on admin_alerts
- Admin-only INSERT on entity_versions
- Admin + owner SELECT on entity_versions
*/

-- ============ Add columns to existing tables ============
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS is_restricted boolean DEFAULT false;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS restriction_note text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false;

-- ============ entity_versions ============
CREATE TABLE IF NOT EXISTS entity_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE entity_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_insert_versions" ON entity_versions;
CREATE POLICY "admin_insert_versions" ON entity_versions FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_select_versions" ON entity_versions;
CREATE POLICY "admin_select_versions" ON entity_versions FOR SELECT
  TO authenticated USING (is_admin());

-- ============ admin_alerts ============
CREATE TABLE IF NOT EXISTS admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL DEFAULT 'broadcast',
  target_id text DEFAULT 'all',
  area text,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_insert_alerts" ON admin_alerts;
CREATE POLICY "admin_insert_alerts" ON admin_alerts FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth_select_alerts" ON admin_alerts;
CREATE POLICY "auth_select_alerts" ON admin_alerts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_delete_alerts" ON admin_alerts;
CREATE POLICY "admin_delete_alerts" ON admin_alerts FOR DELETE
  TO authenticated USING (is_admin());

-- ============ Trigger: auto-snapshot on update ============
CREATE OR REPLACE FUNCTION snapshot_entity_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO entity_versions (entity_type, entity_id, snapshot, created_by)
  VALUES (TG_ARGV[0], OLD.id, to_jsonb(OLD), auth.uid());
  -- Keep only last 3 versions per entity
  DELETE FROM entity_versions
  WHERE entity_type = TG_ARGV[0]
    AND entity_id = OLD.id
    AND id NOT IN (
      SELECT id FROM entity_versions
      WHERE entity_type = TG_ARGV[0] AND entity_id = OLD.id
      ORDER BY created_at DESC
      LIMIT 3
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS facilities_version_trigger ON facilities;
CREATE TRIGGER facilities_version_trigger
  AFTER UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION snapshot_entity_version('facility');

DROP TRIGGER IF EXISTS medicines_version_trigger ON medicines;
CREATE TRIGGER medicines_version_trigger
  AFTER UPDATE ON medicines
  FOR EACH ROW EXECUTE FUNCTION snapshot_entity_version('medicine');
