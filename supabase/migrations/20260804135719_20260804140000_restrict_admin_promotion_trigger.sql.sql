/*
# Restrict admin role promotion to authorized email only

## Purpose
Only the account hussein7.7naser@gmail.com may promote any user to the `admin` role.
Any other admin can still change roles between citizen/pharmacist/facility_owner,
but cannot set role = 'admin'. This is enforced at the database level via a
BEFORE UPDATE trigger, so it cannot be bypassed by client-side code.

## Changes
1. Creates a SECURITY DEFINER function `check_admin_promotion()` that runs before
   any UPDATE on `profiles`. If the new `role` is 'admin' and the old `role` was not
   'admin', it checks the caller's email via `auth.uid() -> auth.users.email`.
   If the caller's email is not the authorized one, it raises an exception.
2. Creates trigger `enforce_admin_promotion_restriction` on `profiles` calling
   this function BEFORE UPDATE.

## Security
- SECURITY DEFINER with `search_path = 'public'` to prevent search_path injection.
- Uses `auth.uid()` to identify the caller (not `current_user`).
- The authorized email is hardcoded in the function body.
- Existing admins keep their role (the trigger only fires when promoting TO admin
  from a non-admin role).
*/

CREATE OR REPLACE FUNCTION public.check_admin_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_email text;
BEGIN
  -- Only restrict when promoting TO admin from a non-admin role
  IF NEW.role = 'admin' AND OLD.role <> 'admin' THEN
    -- Get the caller's email from auth.users
    SELECT email INTO caller_email
    FROM auth.users
    WHERE id = auth.uid();

    IF caller_email IS NULL OR caller_email <> 'hussein7.7naser@gmail.com' THEN
      RAISE EXCEPTION 'Only the authorized account can promote users to admin role';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_admin_promotion_restriction ON profiles;
CREATE TRIGGER enforce_admin_promotion_restriction
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_admin_promotion();
