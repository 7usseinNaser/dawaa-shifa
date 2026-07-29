/*
# Add medicine donations, search logs, emergency broadcasts, and availability alerts

1. New Tables
- `medicine_donations` — citizens offer surplus unused medicines for redistribution to verified pharmacies/facilities.
  Columns: id, donor_id, donor_name, medicine_name, generic_name, quantity, expiry_date, condition (sealed/loose), area, notes, status (pending/approved/rejected/distributed), recipient_pharmacy_id, created_at, updated_at.
- `search_logs` — anonymized medicine/facility search events for heatmap analytics.
  Columns: id, user_id (nullable), query, search_type (medicine/facility), area (nullable), created_at.
- `emergency_broadcasts` — admin sends geographically-scoped emergency notifications.
  Columns: id, title, message, area (target governorate or 'all'), severity (info/warning/emergency), created_by, created_at, expires_at.
- `availability_alerts` — citizens subscribe to be notified when a specific medicine becomes available.
  Columns: id, user_id, medicine_name, pharmacy_id (nullable), notified (bool), created_at, notified_at.

2. Security
- Enable RLS on all new tables.
- medicine_donations: authenticated users can insert their own, select all (for transparency), update own; admin can update/delete.
- search_logs: authenticated can insert; admin can select all.
- emergency_broadcasts: admin can insert/update/delete; all users (anon, authenticated) can SELECT.
- availability_alerts: authenticated users CRUD their own alerts.
*/
CREATE TABLE IF NOT EXISTS medicine_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  donor_name text DEFAULT '',
  medicine_name text NOT NULL,
  generic_name text DEFAULT '',
  quantity integer DEFAULT 1,
  expiry_date date,
  condition text DEFAULT 'sealed' CHECK (condition IN ('sealed','loose')),
  area text DEFAULT '',
  notes text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','distributed')),
  recipient_pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE medicine_donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_donations" ON medicine_donations;
CREATE POLICY "select_donations" ON medicine_donations FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_donations" ON medicine_donations;
CREATE POLICY "insert_own_donations" ON medicine_donations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = donor_id);
DROP POLICY IF EXISTS "update_own_donations" ON medicine_donations;
CREATE POLICY "update_own_donations" ON medicine_donations FOR UPDATE
  TO authenticated USING (auth.uid() = donor_id) WITH CHECK (auth.uid() = donor_id);
DROP POLICY IF EXISTS "admin_update_donations" ON medicine_donations;
CREATE POLICY "admin_update_donations" ON medicine_donations FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "admin_delete_donations" ON medicine_donations;
CREATE POLICY "admin_delete_donations" ON medicine_donations FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text NOT NULL,
  search_type text DEFAULT 'medicine' CHECK (search_type IN ('medicine','facility')),
  area text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_search_logs" ON search_logs;
CREATE POLICY "insert_search_logs" ON search_logs FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_select_search_logs" ON search_logs;
CREATE POLICY "admin_select_search_logs" ON search_logs FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS emergency_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  area text DEFAULT 'all',
  severity text DEFAULT 'warning' CHECK (severity IN ('info','warning','emergency')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);
ALTER TABLE emergency_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_broadcasts" ON emergency_broadcasts;
CREATE POLICY "select_broadcasts" ON emergency_broadcasts FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_insert_broadcasts" ON emergency_broadcasts;
CREATE POLICY "admin_insert_broadcasts" ON emergency_broadcasts FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "admin_update_broadcasts" ON emergency_broadcasts;
CREATE POLICY "admin_update_broadcasts" ON emergency_broadcasts FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "admin_delete_broadcasts" ON emergency_broadcasts;
CREATE POLICY "admin_delete_broadcasts" ON emergency_broadcasts FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS availability_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE SET NULL,
  notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  notified_at timestamptz
);
ALTER TABLE availability_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_alerts" ON availability_alerts;
CREATE POLICY "select_own_alerts" ON availability_alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_alerts" ON availability_alerts;
CREATE POLICY "insert_own_alerts" ON availability_alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_alerts" ON availability_alerts;
CREATE POLICY "update_own_alerts" ON availability_alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_alerts" ON availability_alerts;
CREATE POLICY "delete_own_alerts" ON availability_alerts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query);
CREATE INDEX IF NOT EXISTS idx_search_logs_area ON search_logs(area);
CREATE INDEX IF NOT EXISTS idx_donations_status ON medicine_donations(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_area ON emergency_broadcasts(area);
CREATE INDEX IF NOT EXISTS idx_avail_alerts_user ON availability_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_avail_alerts_med ON availability_alerts(medicine_name);
