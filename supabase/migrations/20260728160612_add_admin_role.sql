/*
# Add admin role to profiles constraint

## Overview
The profiles table has a CHECK constraint on the `role` column that only allows
'citizen', 'pharmacist', 'facility_admin'. This migration adds 'admin' to allow
admin users who can access the Admin Panel for approving pending registrations.

## Tables Modified
- `profiles`: updates the CHECK constraint on `role` to include 'admin'

## Security
- No RLS policy changes
- The admin role is just an additional allowed value in the role enum

## Important Notes
- Drops and recreates the constraint to add the new value
- Idempotent: safe to re-run
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['citizen'::text, 'pharmacist'::text, 'facility_admin'::text, 'admin'::text]));
