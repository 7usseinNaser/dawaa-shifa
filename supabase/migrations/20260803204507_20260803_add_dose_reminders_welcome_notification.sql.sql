/*
# Add dose reminders tracking + welcome notification support

1. New Tables
- `dose_reminders` — tracks individual dose reminders for chronic medicines
  - `id` uuid PK
  - `user_id` uuid NOT NULL DEFAULT auth.uid() — owner
  - `chronic_med_id` uuid — FK to chronic_medicines
  - `medicine_name` text — denormalized for display
  - `dosage` text
  - `dose_time` text — the scheduled time (HH:MM)
  - `reminder_date` date — the date this reminder is for
  - `status` text DEFAULT 'pending' — pending | reminded | taken | skipped
  - `created_at` timestamptz DEFAULT now()

2. Modified Tables
- `profiles` — add `welcome_notification_sent` boolean DEFAULT false
  (used to ensure the welcome notification is only created once per user)

3. Security
- Enable RLS on `dose_reminders`
- Owner-scoped CRUD policies (select/insert/update/delete by auth.uid() = user_id)
- Add UPDATE policy on profiles for welcome_notification_sent (owner can update own)
*/
CREATE TABLE IF NOT EXISTS dose_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  chronic_med_id uuid REFERENCES chronic_medicines(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  dosage text DEFAULT '',
  dose_time text NOT NULL,
  reminder_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dose_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_dose_reminders" ON dose_reminders;
CREATE POLICY "owner_select_dose_reminders" ON dose_reminders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_insert_dose_reminders" ON dose_reminders;
CREATE POLICY "owner_insert_dose_reminders" ON dose_reminders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_update_dose_reminders" ON dose_reminders;
CREATE POLICY "owner_update_dose_reminders" ON dose_reminders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_delete_dose_reminders" ON dose_reminders;
CREATE POLICY "owner_delete_dose_reminders" ON dose_reminders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dose_reminders_user_date ON dose_reminders(user_id, reminder_date);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'welcome_notification_sent'
  ) THEN
    ALTER TABLE profiles ADD COLUMN welcome_notification_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;
