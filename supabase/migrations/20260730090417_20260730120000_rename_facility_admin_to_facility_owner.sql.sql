/*
# Rename facility_admin role to facility_owner

## Overview
The profiles table has a CHECK constraint on the `role` column that allows
'citizen', 'pharmacist', 'facility_admin', 'admin'. This migration renames
'facility_admin' to 'facility_owner' to better reflect the user's intent.

## Changes
1. Drops the existing CHECK constraint first (so UPDATE can proceed)
2. Updates any existing rows with role='facility_admin' to role='facility_owner'
3. Recreates the CHECK constraint to allow: citizen, pharmacist, facility_owner, admin
4. Idempotent: safe to re-run
*/

-- Step 1: Drop constraint so UPDATE can bypass old check
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Migrate existing data
UPDATE profiles SET role = 'facility_owner' WHERE role = 'facility_admin';

-- Step 3: Recreate constraint with new role name
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['citizen'::text, 'pharmacist'::text, 'facility_owner'::text, 'admin'::text]));
