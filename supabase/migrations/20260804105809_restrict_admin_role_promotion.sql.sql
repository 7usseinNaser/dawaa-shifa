-- Restrict admin role promotion to the authorized email only
-- Only hussein7.7naser@gmail.com can set any user's role to 'admin'
-- All other role changes (citizen <-> pharmacist <-> facility_owner) remain open to any admin

-- Drop the existing admin_update_profiles policy so we can replace it with a stricter version
DROP POLICY IF EXISTS admin_update_profiles ON profiles;

-- New policy: admin can update any profile, BUT role='admin' is blocked server-side via trigger
CREATE POLICY admin_update_profiles ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Trigger function: block role='admin' unless caller is the authorized email
CREATE OR REPLACE FUNCTION public.guard_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  caller_email text;
BEGIN
  -- Only check when role is being changed TO 'admin'
  IF NEW.role = 'admin' AND (OLD.role IS DISTINCT FROM 'admin') THEN
    SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
    IF caller_email IS NULL OR caller_email != 'hussein7.7naser@gmail.com' THEN
      RAISE EXCEPTION 'Unauthorized: only the authorized admin email can promote users to admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS guard_admin_role_trigger ON profiles;
CREATE TRIGGER guard_admin_role_trigger
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_admin_role();
