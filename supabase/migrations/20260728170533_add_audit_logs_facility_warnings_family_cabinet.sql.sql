/*
# Audit Logs, Facility Warnings/Freeze, Family Cabinet

## Overview
1. audit_logs — records every admin action (create/update/delete) with actor, action, entity, timestamp
2. facility_warnings — official warnings sent to facility/pharmacy owners, shown in their dashboard
3. family_cabinet — shared family medicine cabinet: members + their chronic meds tracked from one account
4. chronic_medicines table — moves chronic meds from localStorage to DB for refill prediction + multi-member

## New Tables
- audit_logs: id, actor_id, actor_name, action (create|update|delete|restore|freeze|warn), entity_type, entity_id, details jsonb, created_at
- facility_warnings: id, target_type (facility|pharmacy), target_id, message, severity (info|warning|emergency), created_by, created_at, acknowledged_at
- family_cabinet: id, owner_id (account holder), member_name, member_age, member_relation (self|child|parent|spouse|other), created_at
- chronic_medicines: id, cabinet_id (nullable, null = personal), member_id (nullable), user_id, name, dosage, times, pills_left, refill_date, notes, created_at

## Security
- audit_logs: admin-only SELECT, system INSERT via SECURITY DEFINER function
- facility_warnings: admin INSERT, owner SELECT (by target_id ownership), admin UPDATE/DELETE
- family_cabinet: owner-scoped CRUD (auth.uid = owner_id)
- chronic_medicines: owner-scoped via user_id
*/

-- ============ audit_logs ============
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  actor_name text DEFAULT '',
  action text NOT NULL, -- create | update | delete | restore | freeze | unfreeze | warn
  entity_type text DEFAULT '', -- facility | pharmacy | medicine | user | etc
  entity_id text DEFAULT '',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_audit" ON audit_logs;
CREATE POLICY "admin_select_audit" ON audit_logs FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_insert_audit" ON audit_logs;
CREATE POLICY "admin_insert_audit" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_audit" ON audit_logs;
CREATE POLICY "admin_delete_audit" ON audit_logs FOR DELETE
  TO authenticated USING (is_admin());

-- ============ facility_warnings ============
CREATE TABLE IF NOT EXISTS facility_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL DEFAULT 'facility', -- facility | pharmacy
  target_id text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'warning', -- info | warning | emergency
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz
);
ALTER TABLE facility_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_insert_warnings" ON facility_warnings;
CREATE POLICY "admin_insert_warnings" ON facility_warnings FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_select_warnings" ON facility_warnings;
CREATE POLICY "admin_select_warnings" ON facility_warnings FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "owner_select_warnings" ON facility_warnings;
CREATE POLICY "owner_select_warnings" ON facility_warnings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM facilities WHERE facilities.id = facility_warnings.target_id::uuid AND facilities.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = facility_warnings.target_id::uuid AND pharmacies.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_update_warnings" ON facility_warnings;
CREATE POLICY "admin_update_warnings" ON facility_warnings FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_warnings" ON facility_warnings;
CREATE POLICY "admin_delete_warnings" ON facility_warnings FOR DELETE
  TO authenticated USING (is_admin());

-- ============ family_cabinet ============
CREATE TABLE IF NOT EXISTS family_cabinet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  member_age integer DEFAULT 0,
  member_relation text NOT NULL DEFAULT 'self', -- self | child | parent | spouse | other
  created_at timestamptz DEFAULT now()
);
ALTER TABLE family_cabinet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_cabinet" ON family_cabinet;
CREATE POLICY "owner_select_cabinet" ON family_cabinet FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owner_insert_cabinet" ON family_cabinet;
CREATE POLICY "owner_insert_cabinet" ON family_cabinet FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owner_update_cabinet" ON family_cabinet;
CREATE POLICY "owner_update_cabinet" ON family_cabinet FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owner_delete_cabinet" ON family_cabinet;
CREATE POLICY "owner_delete_cabinet" ON family_cabinet FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============ chronic_medicines ============
CREATE TABLE IF NOT EXISTS chronic_medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cabinet_id uuid REFERENCES family_cabinet(id) ON DELETE CASCADE,
  member_id uuid REFERENCES family_cabinet(id) ON DELETE SET NULL,
  name text NOT NULL,
  dosage text DEFAULT '',
  times text DEFAULT '',
  pills_left integer DEFAULT 0,
  pills_per_day numeric DEFAULT 1,
  refill_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chronic_medicines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_chronic" ON chronic_medicines;
CREATE POLICY "owner_select_chronic" ON chronic_medicines FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_insert_chronic" ON chronic_medicines;
CREATE POLICY "owner_insert_chronic" ON chronic_medicines FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_update_chronic" ON chronic_medicines;
CREATE POLICY "owner_update_chronic" ON chronic_medicines FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_delete_chronic" ON chronic_medicines;
CREATE POLICY "owner_delete_chronic" ON chronic_medicines FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ Add frozen flag to profiles ============
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS frozen boolean DEFAULT false;
