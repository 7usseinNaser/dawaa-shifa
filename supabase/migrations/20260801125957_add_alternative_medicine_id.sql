/*
# Add alternative_medicine_id column to medicines table

1. Modified Tables
- `medicines`: add `alternative_medicine_id` (uuid, nullable, self-referencing FK to medicines.id)
  - Stores a link to another medicine that can serve as a substitute when this one is out of stock.
  - Nullable: most medicines won't have an alternative specified.
  - Self-referencing FK with ON DELETE SET NULL: if the alternative is deleted, the link is cleared, not cascaded.

2. Security
- No RLS policy changes — existing policies on medicines remain unchanged.
- The new column is accessible to the same roles that already have CRUD on medicines.

3. Notes
- This is an additive-only change; no data loss.
- The frontend pharmacist "Add Medicine" form will let pharmacists optionally select
  an alternative from their own inventory or the global medicine list.
*/
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicines' AND column_name = 'alternative_medicine_id'
  ) THEN
    ALTER TABLE medicines ADD COLUMN alternative_medicine_id uuid;
    ALTER TABLE medicines
      ADD CONSTRAINT fk_alternative_medicine
      FOREIGN KEY (alternative_medicine_id) REFERENCES medicines(id)
      ON DELETE SET NULL;
  END IF;
END $$;
