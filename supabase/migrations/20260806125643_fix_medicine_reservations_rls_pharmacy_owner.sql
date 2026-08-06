/*
# Fix medicine_reservations RLS policies for pharmacist access

## Problem
The RLS policies on `medicine_reservations` checked `auth.uid() = pharmacy_id`,
but `pharmacy_id` stores the pharmacy's UUID (from the `pharmacies` table),
while `auth.uid()` returns the pharmacist's user UUID. These are different IDs.
The pharmacist's user ID is stored in `pharmacies.owner_id`, not `pharmacies.id`.
This caused pharmacists to see ZERO reservations even though they exist.

## Fix
Rewrite SELECT, UPDATE, and DELETE policies to check ownership via a subquery:
  EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = medicine_reservations.pharmacy_id AND pharmacies.owner_id = auth.uid())

## Tables modified
- `medicine_reservations` (no schema changes, only policies)

## Security changes
- SELECT: pharmacist can read reservations for their own pharmacy
- UPDATE: pharmacist can update reservations for their own pharmacy
- DELETE: pharmacist can delete reservations for their own pharmacy
- INSERT: unchanged (user inserts their own reservation)
*/

-- Fix SELECT policy
DROP POLICY IF EXISTS "select_reservations" ON medicine_reservations;
CREATE POLICY "select_reservations"
ON medicine_reservations FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = medicine_reservations.pharmacy_id
    AND pharmacies.owner_id = auth.uid()
  )
);

-- Fix UPDATE policy
DROP POLICY IF EXISTS "update_reservations" ON medicine_reservations;
CREATE POLICY "update_reservations"
ON medicine_reservations FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = medicine_reservations.pharmacy_id
    AND pharmacies.owner_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = medicine_reservations.pharmacy_id
    AND pharmacies.owner_id = auth.uid()
  )
);

-- Fix DELETE policy
DROP POLICY IF EXISTS "delete_reservations" ON medicine_reservations;
CREATE POLICY "delete_reservations"
ON medicine_reservations FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = medicine_reservations.pharmacy_id
    AND pharmacies.owner_id = auth.uid()
  )
);

-- INSERT policy stays the same (user creates their own reservation)
DROP POLICY IF EXISTS "insert_reservations" ON medicine_reservations;
CREATE POLICY "insert_reservations"
ON medicine_reservations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
