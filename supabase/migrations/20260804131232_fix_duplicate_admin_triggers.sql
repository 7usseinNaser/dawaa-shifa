
-- Drop orphaned triggers that reference non-existent function guard_admin_role()
-- These were blocking ALL role updates including legitimate admin promotions by hussein
DROP TRIGGER IF EXISTS guard_admin_role_trigger ON profiles;
DROP TRIGGER IF EXISTS trg_guard_admin_role ON profiles;

-- Drop the orphaned function if it somehow exists
DROP FUNCTION IF EXISTS guard_admin_role() CASCADE;

-- Keep only the working trigger: guard_admin_role_change → prevent_unauthorized_admin_promotion()
-- (already exists and works correctly)

-- Fix is_admin function: add search_path for security
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid() AND role = 'admin'
);
$function$;
