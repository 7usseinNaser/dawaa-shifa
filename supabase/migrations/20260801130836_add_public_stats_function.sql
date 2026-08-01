/*
# Add public stats function for anon access

1. New Functions
- `get_public_stats()`: SECURITY DEFINER function that returns aggregate counts
  (user count, pharmacy count, facility count, medical point count, status distribution)
  without exposing any row-level data. This allows the landing page (anon key)
  to display real counts without needing SELECT policies on profiles.

2. Security
- SECURITY DEFINER: runs with the function owner's privileges, bypassing RLS.
- Returns only aggregate counts, no individual row data.
- EXECUTE granted to anon and authenticated.

3. Notes
- The profiles table RLS only allows authenticated users to see their own row.
  This function safely exposes the COUNT without exposing any user data.
*/
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'user_count', (SELECT COUNT(*) FROM profiles WHERE deleted_at IS NULL),
    'pharmacy_count', (SELECT COUNT(*) FROM pharmacies WHERE deleted_at IS NULL AND approval_status = 'approved'),
    'facility_count', (SELECT COUNT(*) FROM facilities WHERE deleted_at IS NULL AND approval_status = 'approved'),
    'medical_point_count', (SELECT COUNT(*) FROM facilities WHERE deleted_at IS NULL AND approval_status = 'approved' AND type = 'medical_point'),
    'status_dist', json_build_object(
      'open', (SELECT COUNT(*) FROM facilities WHERE deleted_at IS NULL AND approval_status = 'approved' AND overall_status = 'open') +
               (SELECT COUNT(*) FROM pharmacies WHERE deleted_at IS NULL AND approval_status = 'approved' AND status = 'open'),
      'busy', (SELECT COUNT(*) FROM facilities WHERE deleted_at IS NULL AND approval_status = 'approved' AND overall_status = 'busy') +
              (SELECT COUNT(*) FROM pharmacies WHERE deleted_at IS NULL AND approval_status = 'approved' AND status = 'busy'),
      'emergency', (SELECT COUNT(*) FROM facilities WHERE deleted_at IS NULL AND approval_status = 'approved' AND overall_status = 'emergency') +
                   (SELECT COUNT(*) FROM pharmacies WHERE deleted_at IS NULL AND approval_status = 'approved' AND status = 'emergency'),
      'closed', (SELECT COUNT(*) FROM facilities WHERE deleted_at IS NULL AND approval_status = 'approved' AND overall_status = 'closed') +
                (SELECT COUNT(*) FROM pharmacies WHERE deleted_at IS NULL AND approval_status = 'approved' AND status = 'closed')
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;
