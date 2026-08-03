/*
# Reference Pharmacy System + Demo Data Cleanup

## Summary
1. Adds `is_reference` boolean to `pharmacies` — marks a pharmacy as a reference template hidden from citizen search.
2. Adds `facility_id` uuid to `pharmacies` — links a pharmacy to a facility (hospital internal pharmacy).
3. Soft-deletes all demo/fake pharmacies (owner_id IS NULL).
4. Creates reference pharmacy "صيدلية نظام" in Khan Younis with 30 common medicines.
5. Updates public read policy to exclude reference pharmacies from anonymous reads.
6. Fixes log_public_activity trigger function to cast uuid to text.

## New Columns
- `pharmacies.is_reference` (boolean, default false)
- `pharmacies.facility_id` (uuid, nullable, references facilities.id)
*/

-- Step 0: Fix the trigger function to cast uuid to text
CREATE OR REPLACE FUNCTION public.on_medicine_availability_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
pharm_name text;
BEGIN
IF (TG_OP = 'INSERT' AND NEW.is_available AND NEW.deleted_at IS NULL)
OR (TG_OP = 'UPDATE' AND OLD.is_available IS DISTINCT FROM NEW.is_available
AND NEW.is_available AND NEW.deleted_at IS NULL) THEN
SELECT name INTO pharm_name FROM public.pharmacies WHERE id = NEW.pharmacy_id;
PERFORM public.log_public_activity(
'medicine_available',
'توفّر دواء ' || NEW.medicine_name || ' في ' || COALESCE(pharm_name, 'صيدلية'),
NEW.medicine_name || ' is now available at ' || COALESCE(pharm_name, 'pharmacy'),
'pharmacy',
NEW.pharmacy_id::text,
jsonb_build_object('medicine', NEW.medicine_name, 'pharmacy', pharm_name, 'price', NEW.price)
);
END IF;
RETURN NEW;
END;
$function$;

-- Step 1: Add columns
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS is_reference boolean NOT NULL DEFAULT false;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL;

-- Step 2: Soft-delete all demo pharmacies (owner_id IS NULL and not already deleted)
UPDATE pharmacies
SET deleted_at = now(),
    approval_status = 'rejected',
    rejection_reason = 'Demo data removed during reference pharmacy migration'
WHERE owner_id IS NULL
  AND deleted_at IS NULL;

-- Also soft-delete medicines belonging to those demo pharmacies
UPDATE medicines
SET deleted_at = now()
WHERE pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id IS NULL)
  AND deleted_at IS NULL;

-- Step 3: Create the reference pharmacy "صيدلية نظام" in Khan Younis
INSERT INTO pharmacies (
  id, owner_id, name, area, address, lat, lng, phone, open_hours,
  is_open, rating, reviews_count, status, verified, power_status,
  approval_status, is_reference, deleted_at, last_updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  NULL, 'صيدلية نظام', 'خانيونس',
  'خانيونس - شارع جمال عبد الناصر - بجوار مستشفى ناصر',
  31.3457, 34.3063, '08-123456', '08:00-22:00',
  true, 0, 0, 'open', true, 'grid',
  'approved', true, NULL, now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  area = EXCLUDED.area,
  address = EXCLUDED.address,
  is_reference = true,
  deleted_at = NULL,
  approval_status = 'approved',
  verified = true;

-- Step 4: Add 30 common medicines to the reference pharmacy
INSERT INTO medicines (pharmacy_id, medicine_name, generic_name, price, quantity, category, is_available, is_restricted, restriction_note, expiry_date, is_incomplete, last_updated)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  t.col1, t.col2, t.col3, t.col4, t.col5, t.col6, t.col7, t.col8, t.col9, t.col10, now()
FROM (VALUES
  ('باراسيتامول 500mg', 'Paracetamol', 5.0, 100, 'مسكنات', true, false, NULL::text, '2027-06-30'::date, false),
  ('ايبوبروفين 400mg', 'Ibuprofen', 8.0, 80, 'مسكنات', true, false, NULL::text, '2027-03-31'::date, false),
  ('اموكسيسيلين 500mg', 'Amoxicillin', 15.0, 50, 'مضادات حيوية', true, false, NULL::text, '2027-01-31'::date, false),
  ('أزيثرومايسين 250mg', 'Azithromycin', 25.0, 40, 'مضادات حيوية', true, false, NULL::text, '2027-09-30'::date, false),
  ('سيفكسيم 200mg', 'Cefixime', 30.0, 30, 'مضادات حيوية', true, false, NULL::text, '2027-05-31'::date, false),
  ('أوميبرازول 20mg', 'Omeprazole', 12.0, 60, 'جهاز هضمي', true, false, NULL::text, '2027-08-31'::date, false),
  ('رانيتيدين 150mg', 'Ranitidine', 10.0, 70, 'جهاز هضمي', true, false, NULL::text, '2027-04-30'::date, false),
  ('ميتفورمين 500mg', 'Metformin', 7.0, 90, 'سكري', true, false, NULL::text, '2027-07-31'::date, false),
  ('غليبيزيد 5mg', 'Glipizide', 9.0, 50, 'سكري', true, false, NULL::text, '2027-02-28'::date, false),
  ('إنسولين بشري 100IU', 'Insulin', 45.0, 20, 'سكري', true, false, NULL::text, '2027-10-31'::date, false),
  ('أتورفاستاتين 20mg', 'Atorvastatin', 18.0, 40, 'قلب وشرايين', true, false, NULL::text, '2027-11-30'::date, false),
  ('أسبرين 75mg', 'Aspirin', 4.0, 100, 'قلب وشرايين', true, false, NULL::text, '2027-12-31'::date, false),
  ('أتينولول 50mg', 'Atenolol', 6.0, 60, 'قلب وشرايين', true, false, NULL::text, '2027-06-30'::date, false),
  ('أملوديبين 5mg', 'Amlodipine', 8.0, 55, 'قلب وشرايين', true, false, NULL::text, '2027-05-31'::date, false),
  ('ليفوثيروكسين 50mcg', 'Levothyroxine', 14.0, 45, 'هرمونات', true, false, NULL::text, '2027-09-30'::date, false),
  ('لوراتادين 10mg', 'Loratadine', 7.0, 80, 'حساسية', true, false, NULL::text, '2027-08-31'::date, false),
  ('سيتريزين 10mg', 'Cetirizine', 6.0, 75, 'حساسية', true, false, NULL::text, '2027-07-31'::date, false),
  ('سالبوتامول بخاخ', 'Salbutamol', 22.0, 30, 'ربو', true, false, NULL::text, '2027-04-30'::date, false),
  ('بكلوميتازون بخاخ', 'Beclometasone', 28.0, 25, 'ربو', true, false, NULL::text, '2027-03-31'::date, false),
  ('فيتامين د 50000IU', 'Vitamin D', 12.0, 50, 'فيتامينات', true, false, NULL::text, '2028-01-31'::date, false),
  ('فيتامين ب المركب', 'Vitamin B Complex', 10.0, 60, 'فيتامينات', true, false, NULL::text, '2027-10-31'::date, false),
  ('حديد فوليك', 'Iron+Folic Acid', 8.0, 70, 'فيتامينات', true, false, NULL::text, '2027-09-30'::date, false),
  ('كالسيوم + د3', 'Calcium+D3', 15.0, 50, 'فيتامينات', true, false, NULL::text, '2027-12-31'::date, false),
  ('ديكساميثازون 4mg', 'Dexamethasone', 5.0, 40, 'كورتيكوستيرويد', true, false, NULL::text, '2027-06-30'::date, false),
  ('ميتكلوبرراميد 10mg', 'Metoclopramide', 4.0, 60, 'جهاز هضمي', true, false, NULL::text, '2027-05-31'::date, false),
  ('هيدروكورتيزون كريم', 'Hydrocortisone', 9.0, 35, 'جلدية', true, false, NULL::text, '2027-08-31'::date, false),
  ('كلوتريمازول كريم', 'Clotrimazole', 7.0, 40, 'جلدية', true, false, NULL::text, '2027-07-31'::date, false),
  ('ميبيفيكين 135mg', 'Mebeverine', 11.0, 45, 'جهاز هضمي', true, false, NULL::text, '2027-04-30'::date, false),
  ('نيميسوليد 100mg', 'Nimesulide', 7.0, 55, 'مسكنات', true, false, NULL::text, '2027-03-31'::date, false),
  ('ديكلوفيناك 50mg', 'Diclofenac', 6.0, 65, 'مسكنات', true, false, NULL::text, '2027-02-28'::date, false)
) AS t(col1, col2, col3, col4, col5, col6, col7, col8, col9, col10)
WHERE NOT EXISTS (
  SELECT 1 FROM medicines WHERE pharmacy_id = 'a0000000-0000-0000-0000-000000000001' AND deleted_at IS NULL LIMIT 1
);

-- Step 5: Update public read policy to exclude reference pharmacies from anonymous reads
DROP POLICY IF EXISTS "public_read_pharmacies" ON pharmacies;
CREATE POLICY "public_read_pharmacies" ON pharmacies FOR SELECT
  TO anon, authenticated USING (
    (is_reference = false AND approval_status = 'approved' AND deleted_at IS NULL)
    OR is_admin()
    OR auth.uid() = owner_id
    OR (is_reference = true AND auth.uid() IS NOT NULL)
  );
