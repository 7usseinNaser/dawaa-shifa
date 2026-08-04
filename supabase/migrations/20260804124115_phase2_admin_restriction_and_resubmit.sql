/*
# Phase 2: Restrict admin role promotion + resubmit support

## 1. Security: Restrict admin role promotion
- Create a trigger function `prevent_unauthorized_admin_promotion()` that:
  - Blocks any UPDATE to profiles.role = 'admin' UNLESS the acting user's email is 'hussein7.7naser@gmail.com'
  - This runs at the database level, so it cannot be bypassed by the frontend
  - Other role changes (citizen ↔ pharmacist ↔ facility_owner) remain unrestricted
- Create a trigger `guard_admin_role_change` on profiles BEFORE UPDATE

## 2. Resubmit support
- Add `resubmitted` (boolean default false) and `resubmitted_at` (timestamptz) columns to pharmacies and facilities
- These track when an owner resubmits after rejection
- The rejection_reason is preserved (not cleared) on resubmit so admin can see the previous reason
- Only cleared when the admin approves or rejects again

## 3. Important notes
- The trigger uses auth.email() to check the acting user's email
- The trigger allows self-demotion (an admin can remove their own admin role)
- The trigger blocks promoting OTHER users to admin unless the acting user is the super-admin email
*/

-- =========================================================
-- 1. Restrict admin role promotion via database trigger
-- =========================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS guard_admin_role_change ON profiles;

-- Create the guard function
CREATE OR REPLACE FUNCTION prevent_unauthorized_admin_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acting_email text;
BEGIN
  -- Only check when role is being changed TO 'admin'
  IF NEW.role = 'admin' AND (OLD.role IS DISTINCT FROM 'admin') THEN
    -- Get the acting user's email from auth
    SELECT email INTO acting_email FROM auth.users WHERE id = auth.uid();
    
    -- Only hussein7.7naser@gmail.com can promote to admin
    IF acting_email IS NULL OR acting_email != 'hussein7.7naser@gmail.com' THEN
      RAISE EXCEPTION 'Only the super-admin (hussein7.7naser@gmail.com) can promote users to admin role';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER guard_admin_role_change
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_unauthorized_admin_promotion();

-- =========================================================
-- 2. Add resubmit tracking columns
-- =========================================================

ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS resubmitted boolean DEFAULT false;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS resubmitted_at timestamptz;

ALTER TABLE facilities ADD COLUMN IF NOT EXISTS resubmitted boolean DEFAULT false;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS resubmitted_at timestamptz;

-- =========================================================
-- 3. RLS: Allow owners to resubmit their rejected entities
-- =========================================================
-- The existing owner_update_pharmacies and owner_update_facilities policies
-- already allow owners to UPDATE their own rows, so resubmit works.
-- No new policies needed.

-- =========================================================
-- 4. Grant EXECUTE on the guard function to authenticated
-- =========================================================
GRANT EXECUTE ON FUNCTION prevent_unauthorized_admin_promotion() TO authenticated;
