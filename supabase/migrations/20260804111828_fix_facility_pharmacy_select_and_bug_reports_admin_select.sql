/*
# Fix facility pharmacy SELECT and add owner_select for pending pharmacies

## Problem
1. Bug #6: FacilityPharmacy creates a pharmacy with `owner_id = null` and `approval_status = 'pending'`.
   The only SELECT policy on pharmacies (`public_read_pharmacies`) requires `approval_status = 'approved'`,
   so the facility owner cannot read their own pending pharmacy back. This leaves `pharmacy` state null
   and breaks all add/clone medicine buttons in the facility's internal pharmacy UI.

2. Bug #5: Admin panel cannot see bug reports. The `select_own_bug_reports` policy uses
   `(auth.uid() = reporter_id) OR is_admin()` but the admin needs a clean SELECT policy.

## Changes
1. Add `owner_select_pharmacies` SELECT policy: allows a facility owner to read pharmacies
   linked to their facility (via `facility_id`), regardless of approval_status.
   Also allows pharmacy owners to read their own pharmacy by `owner_id`.
2. Add `admin_select_pharmacies` SELECT policy: allows admin to read all pharmacies.
3. Add `admin_select_bug_reports` SELECT policy: allows admin to read all bug reports.
4. Add `admin_select_suggestions` already exists but verify.

## Security
- All new policies are scoped to `authenticated` role.
- Owner SELECT is scoped to `auth.uid() = owner_id` OR facility ownership chain.
- Admin SELECT requires `is_admin()` check.
*/

-- 1. Owner can SELECT their own pharmacy (by owner_id or facility ownership)
DROP POLICY IF EXISTS "owner_select_pharmacies" ON pharmacies;
CREATE POLICY "owner_select_pharmacies"
ON pharmacies FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR (
    facility_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM facilities f
      WHERE f.id = pharmacies.facility_id
      AND f.owner_id = auth.uid()
    )
  )
);

-- 2. Admin can SELECT all pharmacies
DROP POLICY IF EXISTS "admin_select_pharmacies" ON pharmacies;
CREATE POLICY "admin_select_pharmacies"
ON pharmacies FOR SELECT
TO authenticated
USING (is_admin());

-- 3. Admin can SELECT all bug reports (clean explicit policy)
DROP POLICY IF EXISTS "admin_select_bug_reports" ON bug_reports;
CREATE POLICY "admin_select_bug_reports"
ON bug_reports FOR SELECT
TO authenticated
USING (is_admin());
