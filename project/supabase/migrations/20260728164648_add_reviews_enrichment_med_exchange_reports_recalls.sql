/*
# Reviews Enrichment, Med-Exchange, Data Reports, Batch Recalls

## Overview
- Enrich reviews table with target_type + target_name for display
- Add med_exchange_requests table (controlled exchange/donation of near-expiry meds)
- Add data_reports table (citizen reports wrong data to admin)
- Add batch_recalls table (recall dangerous batches)
- Add last_updated_at to facilities/pharmacies for freshness indicator

## Tables Modified
- reviews: add target_type text, target_name text
- facilities: add last_updated_at timestamptz DEFAULT now()
- pharmacies: add last_updated_at timestamptz DEFAULT now()

## New Tables
- med_exchange_requests: near-expiry med exchange/donation requests with admin moderation
- data_reports: citizen reports of inaccurate facility/medicine data
- batch_recalls: recalled batches with auto-notification
*/

-- ============ Enrich reviews ============
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'facility';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS target_name text DEFAULT '';

-- ============ Freshness indicator ============
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS last_updated_at timestamptz DEFAULT now();
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS last_updated_at timestamptz DEFAULT now();

-- ============ med_exchange_requests ============
CREATE TABLE IF NOT EXISTS med_exchange_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name text NOT NULL,
  generic_name text DEFAULT '',
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  pharmacy_name text DEFAULT '',
  requester_id uuid REFERENCES auth.users(id),
  requester_name text DEFAULT '',
  request_type text NOT NULL DEFAULT 'exchange', -- exchange | donate
  quantity integer DEFAULT 1,
  price numeric DEFAULT 0, -- 0 = free
  expiry_date date,
  storage_conditions text DEFAULT '',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);
ALTER TABLE med_exchange_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_exchange" ON med_exchange_requests;
CREATE POLICY "auth_select_exchange" ON med_exchange_requests FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_exchange" ON med_exchange_requests;
CREATE POLICY "auth_insert_exchange" ON med_exchange_requests FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_exchange" ON med_exchange_requests;
CREATE POLICY "admin_update_exchange" ON med_exchange_requests FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_exchange" ON med_exchange_requests;
CREATE POLICY "admin_delete_exchange" ON med_exchange_requests FOR DELETE
  TO authenticated USING (is_admin());

-- ============ data_reports ============
CREATE TABLE IF NOT EXISTS data_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id),
  reporter_name text DEFAULT '',
  target_type text NOT NULL DEFAULT 'facility', -- facility | pharmacy | medicine
  target_id text NOT NULL,
  target_name text DEFAULT '',
  issue_type text NOT NULL DEFAULT 'wrong_status', -- wrong_status | wrong_availability | wrong_info | other
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open', -- open | resolved | dismissed
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE data_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_insert_reports" ON data_reports;
CREATE POLICY "auth_insert_reports" ON data_reports FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_select_reports" ON data_reports;
CREATE POLICY "admin_select_reports" ON data_reports FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_update_reports" ON data_reports;
CREATE POLICY "admin_update_reports" ON data_reports FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_reports" ON data_reports;
CREATE POLICY "admin_delete_reports" ON data_reports FOR DELETE
  TO authenticated USING (is_admin());

-- ============ batch_recalls ============
CREATE TABLE IF NOT EXISTS batch_recalls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name text NOT NULL,
  batch_number text NOT NULL,
  reason text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'warning', -- info | warning | danger
  status text NOT NULL DEFAULT 'active', -- active | resolved
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE batch_recalls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_recalls" ON batch_recalls;
CREATE POLICY "auth_select_recalls" ON batch_recalls FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_recalls" ON batch_recalls;
CREATE POLICY "admin_insert_recalls" ON batch_recalls FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_recalls" ON batch_recalls;
CREATE POLICY "admin_update_recalls" ON batch_recalls FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_recalls" ON batch_recalls;
CREATE POLICY "admin_delete_recalls" ON batch_recalls FOR DELETE
  TO authenticated USING (is_admin());

-- ============ Update last_updated_at on row update ============
CREATE OR REPLACE FUNCTION update_last_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS facilities_last_updated ON facilities;
CREATE TRIGGER facilities_last_updated
  BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION update_last_updated_at();

DROP TRIGGER IF EXISTS pharmacies_last_updated ON pharmacies;
CREATE TRIGGER pharmacies_last_updated
  BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION update_last_updated_at();
