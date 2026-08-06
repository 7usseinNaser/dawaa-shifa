-- Add entity_type column to conversations for proper grouping in admin panel
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS entity_type text;

-- Backfill entity_type from entity_name heuristics for existing rows
UPDATE conversations
SET entity_type = CASE
  WHEN entity_name ILIKE '%مستشف%' OR entity_name ILIKE '%مرفق%' OR entity_name ILIKE '%hosp%' OR entity_name ILIKE '%facil%' OR entity_name = 'facility' THEN 'facility'
  WHEN entity_name ILIKE '%صيدل%' OR entity_name ILIKE '%pharm%' THEN 'pharmacy'
  ELSE 'other'
END
WHERE entity_type IS NULL;
