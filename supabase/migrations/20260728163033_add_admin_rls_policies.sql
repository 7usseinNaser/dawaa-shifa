/*
# Admin Full-Access RLS Policies

## Overview
Grants admin users (role = 'admin' in profiles) full CRUD access to all
data tables: pharmacies, facilities, medicines, departments, reviews,
and profiles. Regular users keep their existing owner-scoped policies.

## Tables Modified
- `pharmacies` — admin can INSERT/UPDATE/DELETE any row
- `facilities` — admin can INSERT/UPDATE/DELETE any row
- `medicines` — admin can INSERT/UPDATE/DELETE any row
- `departments` — admin can INSERT/UPDATE/DELETE any row
- `reviews` — admin can UPDATE/DELETE any row (moderation)
- `profiles` — admin can SELECT/UPDATE any row (user management)

## Security
- Admin check uses: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
- These are ADDITIVE policies — they coexist with existing owner-scoped policies
- A row is accessible if EITHER the owner policy OR the admin policy passes
- Regular users are unaffected — they still only access their own data
*/

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============ PHARMACIES ============
DROP POLICY IF EXISTS "admin_insert_pharmacies" ON pharmacies;
CREATE POLICY "admin_insert_pharmacies" ON pharmacies FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_pharmacies" ON pharmacies;
CREATE POLICY "admin_update_pharmacies" ON pharmacies FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_pharmacies" ON pharmacies;
CREATE POLICY "admin_delete_pharmacies" ON pharmacies FOR DELETE
  TO authenticated USING (is_admin());

-- ============ FACILITIES ============
DROP POLICY IF EXISTS "admin_insert_facilities" ON facilities;
CREATE POLICY "admin_insert_facilities" ON facilities FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_facilities" ON facilities;
CREATE POLICY "admin_update_facilities" ON facilities FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_facilities" ON facilities;
CREATE POLICY "admin_delete_facilities" ON facilities FOR DELETE
  TO authenticated USING (is_admin());

-- ============ MEDICINES ============
DROP POLICY IF EXISTS "admin_insert_medicines" ON medicines;
CREATE POLICY "admin_insert_medicines" ON medicines FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_medicines" ON medicines;
CREATE POLICY "admin_update_medicines" ON medicines FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_medicines" ON medicines;
CREATE POLICY "admin_delete_medicines" ON medicines FOR DELETE
  TO authenticated USING (is_admin());

-- ============ DEPARTMENTS ============
DROP POLICY IF EXISTS "admin_insert_departments" ON departments;
CREATE POLICY "admin_insert_departments" ON departments FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_departments" ON departments;
CREATE POLICY "admin_update_departments" ON departments FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_departments" ON departments;
CREATE POLICY "admin_delete_departments" ON departments FOR DELETE
  TO authenticated USING (is_admin());

-- ============ REVIEWS (moderation) ============
DROP POLICY IF EXISTS "admin_update_reviews" ON reviews;
CREATE POLICY "admin_update_reviews" ON reviews FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_reviews" ON reviews;
CREATE POLICY "admin_delete_reviews" ON reviews FOR DELETE
  TO authenticated USING (is_admin());

-- ============ PROFILES (user management) ============
DROP POLICY IF EXISTS "admin_select_profiles" ON profiles;
CREATE POLICY "admin_select_profiles" ON profiles FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
