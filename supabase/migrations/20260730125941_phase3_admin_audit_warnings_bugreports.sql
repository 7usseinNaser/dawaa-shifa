/*
# Phase 3: Advanced Admin System

1. audit_logs: add before_state / after_state (jsonb) for rollback support
2. facility_warnings: add duration_type, duration_hours, expires_at for configurable warning duration
3. data_reports: status already text — 'reviewing' is a new valid value (no DDL needed)
4. New table: bug_reports (platform bug reports from users, separate from data_reports)
*/

-- 1. Audit log before/after state
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS before_state jsonb,
  ADD COLUMN IF NOT EXISTS after_state jsonb;

-- 2. Facility warnings duration
ALTER TABLE facility_warnings
  ADD COLUMN IF NOT EXISTS duration_type text NOT NULL DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS duration_hours integer,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 4. Bug reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reporter_name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  admin_notes text
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_bug_reports" ON bug_reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "insert_own_bug_reports" ON bug_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "update_bug_reports_admin" ON bug_reports FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "delete_bug_reports_admin" ON bug_reports FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
