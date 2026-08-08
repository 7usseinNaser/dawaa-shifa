/*
# Add suggestions table and enhance conversations with entity_name

1. New Tables
- `suggestions` — stores platform development suggestions from all user types (citizens, pharmacists, facility owners/admins).
  - `id` (uuid PK)
  - `user_id` (uuid, references profiles, nullable for anonymous)
  - `user_name` (text, the display name of the submitter)
  - `user_role` (text: 'citizen', 'pharmacist', 'facility_admin', 'facility_owner', 'admin')
  - `entity_name` (text, the pharmacy/facility name if applicable, empty for citizens)
  - `title` (text, the suggestion title)
  - `description` (text, the suggestion body)
  - `status` (text: 'open', 'reviewing', 'implemented', 'rejected', default 'open')
  - `admin_notes` (text, nullable, admin's internal notes)
  - `created_at` (timestamptz, default now())

2. Modified Tables
- `conversations` — add `entity_name` column (text, nullable) to store the pharmacy/facility name associated with the conversation creator.

3. Security
- Enable RLS on `suggestions`.
- SELECT: authenticated users can read all suggestions (admin needs full visibility; users can see their own).
  Actually, for simplicity and since admin needs to see all, and users see their own: use ownership check for regular users + is_admin() for admins.
- INSERT: authenticated users can insert their own suggestions (user_id = auth.uid()).
- UPDATE: admin only (to change status/notes).
- DELETE: admin only.

- For `conversations`, no RLS changes needed — existing policies already handle ownership + admin access.
*/

-- Create suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT 'citizen',
  entity_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "select_own_suggestions" ON suggestions;
DROP POLICY IF EXISTS "admin_select_suggestions" ON suggestions;
DROP POLICY IF EXISTS "insert_own_suggestions" ON suggestions;
DROP POLICY IF EXISTS "admin_update_suggestions" ON suggestions;
DROP POLICY IF EXISTS "admin_delete_suggestions" ON suggestions;

-- SELECT: users see their own suggestions, admin sees all
CREATE POLICY "select_own_suggestions" ON suggestions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admin_select_suggestions" ON suggestions FOR SELECT
  TO authenticated USING (is_admin());

-- INSERT: users can insert their own suggestions
CREATE POLICY "insert_own_suggestions" ON suggestions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- UPDATE: admin only
CREATE POLICY "admin_update_suggestions" ON suggestions FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- DELETE: admin only
CREATE POLICY "admin_delete_suggestions" ON suggestions FOR DELETE
  TO authenticated USING (is_admin());

-- Add entity_name column to conversations if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'entity_name'
  ) THEN
    ALTER TABLE conversations ADD COLUMN entity_name text;
  END IF;
END $$;

-- Add index for filtering suggestions by role and date
CREATE INDEX IF NOT EXISTS idx_suggestions_user_role ON suggestions(user_role);
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
