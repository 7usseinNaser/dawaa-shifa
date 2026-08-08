/*
# Phase 1: Approval workflow, freeze reasons, medicine expiry, donation tracking
*/

-- 1. pharmacies approval workflow
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT null;
UPDATE pharmacies SET approval_status = 'approved' WHERE verified = true AND approval_status = 'pending';

-- 2. facilities approval workflow
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT null;
UPDATE facilities SET approval_status = 'approved' WHERE verified = true AND approval_status = 'pending';

-- 3. profiles freeze reason
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS freeze_reason text DEFAULT null;

-- 4. medicines expiry + incomplete flag
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS expiry_date date DEFAULT null;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS is_incomplete boolean DEFAULT false;

-- 5. medicine_donations: add missing columns if table already exists
ALTER TABLE medicine_donations ADD COLUMN IF NOT EXISTS donor_phone text DEFAULT '';
ALTER TABLE medicine_donations ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT null;
ALTER TABLE medicine_donations ADD COLUMN IF NOT EXISTS recipient_facility_id uuid DEFAULT null;
ALTER TABLE medicine_donations ADD COLUMN IF NOT EXISTS distributed_at timestamptz DEFAULT null;

-- 6. Audit log entry for admin role restoration
INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, details)
VALUES (null, 'system', 'restore_admin_access', 'profiles', 'dc9cadf0-61ea-4134-8916-f34c552296a7', '{"reason": "Admin access recovery - manual restoration"}'::jsonb)
ON CONFLICT DO NOTHING;
