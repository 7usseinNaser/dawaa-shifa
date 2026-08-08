/*
# Strict Admin Access Control — enforce single authorized admin email

1. Overview
Locks down admin role so ONLY hussein7.7naser@gmail.com can hold role='admin'.
Any other account attempting admin is auto-downgraded to 'citizen' via triggers.

2. Security Changes
- BEFORE INSERT/UPDATE trigger on profiles (SECURITY DEFINER) resolves email
  from auth.users and forces role='citizen' unless email matches authorized admin.
- Second guard trigger fires on UPDATE OF role when role='admin'.
- Cleanup: demote all existing admin rows to 'citizen' (none currently match
  the authorized email).

3. Authorized admin email: hussein7.7naser@gmail.com
*/

-- Step 1: Demote all existing admins to citizen (none match authorized email)
UPDATE public.profiles SET role = 'citizen' WHERE role = 'admin';

-- Step 2: Update the CHECK constraint to include facility_owner
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['citizen'::text, 'pharmacist'::text, 'facility_admin'::text, 'facility_owner'::text, 'admin'::text]));

-- Step 3: Replace the verified trigger function with admin-guarding version
CREATE OR REPLACE FUNCTION public.set_new_user_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_email text;
  v_authorized text := 'hussein7.7naser@gmail.com';
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;

  IF NEW.role = 'admin' THEN
    IF v_email IS NULL OR lower(v_email) <> lower(v_authorized) THEN
      NEW.role := 'citizen';
    END IF;
  END IF;

  IF NEW.role = 'admin' THEN
    NEW.verified := true;
  ELSE
    NEW.verified := false;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_user_verified ON public.profiles;
CREATE TRIGGER trg_set_user_verified
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_new_user_verified();

-- Step 4: Dedicated guard trigger for role escalation attempts
CREATE OR REPLACE FUNCTION public.guard_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_email text;
  v_authorized text := 'hussein7.7naser@gmail.com';
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
    IF v_email IS NULL OR lower(v_email) <> lower(v_authorized) THEN
      NEW.role := 'citizen';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_admin_role ON public.profiles;
CREATE TRIGGER trg_guard_admin_role
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION public.guard_admin_role();
