/*
# Facility-linked pharmacy RLS policies

## Summary
Updates medicines and pharmacies RLS policies to allow facility owners to manage their
facility-linked pharmacy (where owner_id IS NULL but facility_id points to a facility
owned by the authenticated user).

## Changes
- Updates owner_insert/update/delete policies on medicines to also check facility ownership.
- Updates owner_insert/update/delete policies on pharmacies to also check facility ownership.
*/

-- Medicines: allow facility owners to manage medicines in their facility-linked pharmacy
DROP POLICY IF EXISTS "owner_insert_medicines" ON medicines;
CREATE POLICY "owner_insert_medicines" ON medicines FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = medicines.pharmacy_id AND pharmacies.owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM pharmacies p JOIN facilities f ON p.facility_id = f.id WHERE p.id = medicines.pharmacy_id AND f.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_update_medicines" ON medicines;
CREATE POLICY "owner_update_medicines" ON medicines FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = medicines.pharmacy_id AND pharmacies.owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM pharmacies p JOIN facilities f ON p.facility_id = f.id WHERE p.id = medicines.pharmacy_id AND f.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = medicines.pharmacy_id AND pharmacies.owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM pharmacies p JOIN facilities f ON p.facility_id = f.id WHERE p.id = medicines.pharmacy_id AND f.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_delete_medicines" ON medicines;
CREATE POLICY "owner_delete_medicines" ON medicines FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = medicines.pharmacy_id AND pharmacies.owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM pharmacies p JOIN facilities f ON p.facility_id = f.id WHERE p.id = medicines.pharmacy_id AND f.owner_id = auth.uid())
  );

-- Pharmacies: allow facility owners to update their facility-linked pharmacy
DROP POLICY IF EXISTS "owner_update_pharmacies" ON pharmacies;
CREATE POLICY "owner_update_pharmacies" ON pharmacies FOR UPDATE
  TO authenticated USING (
    auth.uid() = owner_id
    OR
    EXISTS (SELECT 1 FROM facilities f WHERE f.id = pharmacies.facility_id AND f.owner_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = owner_id
    OR
    EXISTS (SELECT 1 FROM facilities f WHERE f.id = pharmacies.facility_id AND f.owner_id = auth.uid())
  );

-- Allow facility owners to insert pharmacies linked to their facility
DROP POLICY IF EXISTS "owner_insert_pharmacies" ON pharmacies;
CREATE POLICY "owner_insert_pharmacies" ON pharmacies FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = owner_id
    OR
    (facility_id IS NOT NULL AND EXISTS (SELECT 1 FROM facilities f WHERE f.id = facility_id AND f.owner_id = auth.uid()))
  );

-- Allow facility owners to read their facility-linked pharmacy (already covered by public_read, but ensure)
-- Already handled by public_read_pharmacies policy
