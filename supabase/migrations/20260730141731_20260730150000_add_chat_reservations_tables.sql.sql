-- Chat messages for bug report conversations
CREATE TABLE IF NOT EXISTS bug_report_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id UUID NOT NULL REFERENCES bug_reports(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'admin',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bug_report_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_chats" ON bug_report_chats FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_chats" ON bug_report_chats FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "update_own_chats" ON bug_report_chats FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "delete_own_chats" ON bug_report_chats FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

-- Medicine reservations
CREATE TABLE IF NOT EXISTS medicine_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  medicine_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE medicine_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_reservations" ON medicine_reservations FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = pharmacy_id);
CREATE POLICY "insert_reservations" ON medicine_reservations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_reservations" ON medicine_reservations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = pharmacy_id) WITH CHECK (auth.uid() = user_id OR auth.uid() = pharmacy_id);
CREATE POLICY "delete_reservations" ON medicine_reservations FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = pharmacy_id);

-- Add email to profiles if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
