/*
# Hide incomplete medicines from public search, allow owner to see all

## Problem
Bug #4: BulkImport now saves incomplete medicines with `is_incomplete = true`.
The `public_read_medicines` policy uses `USING (true)`, so citizens would see
incomplete medicines in search results. We need to hide them from the public
while still allowing the pharmacy owner to see and manage their own incomplete medicines.

## Changes
1. Update `public_read_medicines` to exclude incomplete and deleted medicines.
2. Add `owner_select_medicines` SELECT policy: allows pharmacy owners (by owner_id
   or facility ownership chain) to read ALL their medicines, including incomplete ones.

## Security
- Public read: only complete, non-deleted medicines are visible to citizens.
- Owner read: pharmacy owners can see all their medicines including incomplete ones.
- Admin read: admin can see all medicines via is_admin() (already covered by existing
  grants, but we add an explicit policy for clarity).
*/

-- 1. Update public_read_medicines to exclude incomplete and deleted
DROP POLICY IF EXISTS "public_read_medicines" ON medicines;
CREATE POLICY "public_read_medicines"
ON medicines FOR SELECT
TO anon, authenticated
USING (is_incomplete = false AND deleted_at IS NULL);

-- 2. Owner can SELECT all their medicines (including incomplete)
DROP POLICY IF EXISTS "owner_select_medicines" ON medicines;
CREATE POLICY "owner_select_medicines"
ON medicines FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = medicines.pharmacy_id
    AND pharmacies.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM pharmacies p
    JOIN facilities f ON p.facility_id = f.id
    WHERE p.id = medicines.pharmacy_id
    AND f.owner_id = auth.uid()
  )
);

-- 3. Admin can SELECT all medicines
DROP POLICY IF EXISTS "admin_select_medicines" ON medicines;
CREATE POLICY "admin_select_medicines"
ON medicines FOR SELECT
TO authenticated
USING (is_admin());
