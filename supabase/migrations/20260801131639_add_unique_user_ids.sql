/*
# Add unique sequential user IDs by role

1. Modified Tables
- `profiles`: add `unique_id` (text, unique, nullable) — stores a human-readable ID like "1-0001", "2-0001", etc.

2. New Functions
- `generate_unique_id()`: SECURITY DEFINER function that generates the next sequential ID for a given role.
  - Role prefix: 1=citizen, 2=pharmacist, 3=facility_owner, 4=admin
  - Sequential number: padded to 4 digits, incremented per role
- `set_unique_id_on_insert()`: trigger function that calls generate_unique_id() on INSERT to profiles.

3. New Triggers
- `profiles_set_unique_id`: AFTER INSERT trigger on profiles, calls set_unique_id_on_insert().

4. Security
- generate_unique_id is SECURITY DEFINER to bypass RLS for counting existing profiles.
- EXECUTE granted to anon, authenticated.

5. Notes
- Existing profiles get their unique_id backfilled in this migration.
- The unique_id is immutable — no UPDATE trigger, and RLS prevents users from modifying it.
*/
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'unique_id') THEN
    ALTER TABLE profiles ADD COLUMN unique_id text UNIQUE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_unique_id(role_val text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefix text;
  max_seq integer;
  new_id text;
BEGIN
  prefix := CASE role_val
    WHEN 'citizen' THEN '1'
    WHEN 'pharmacist' THEN '2'
    WHEN 'facility_owner' THEN '3'
    WHEN 'admin' THEN '4'
    ELSE '1'
  END;

  SELECT COALESCE(MAX(CAST(SPLIT_PART(unique_id, '-', 2) AS integer)), 0)
  INTO max_seq
  FROM profiles
  WHERE unique_id LIKE prefix || '-%';

  new_id := prefix || '-' || lpad((max_seq + 1)::text, 4, '0');
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_unique_id(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_unique_id_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.unique_id IS NULL THEN
    NEW.unique_id := public.generate_unique_id(COALESCE(NEW.role, 'citizen'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_unique_id ON profiles;
CREATE TRIGGER profiles_set_unique_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_unique_id_on_insert();

-- Backfill existing profiles
DO $$
DECLARE
  r RECORD;
  new_id text;
BEGIN
  FOR r IN SELECT id, role FROM profiles WHERE unique_id IS NULL ORDER BY created_at ASC LOOP
    new_id := public.generate_unique_id(COALESCE(r.role, 'citizen'));
    UPDATE profiles SET unique_id = new_id WHERE id = r.id;
  END LOOP;
END $$;
