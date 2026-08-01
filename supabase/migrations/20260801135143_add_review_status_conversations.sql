/*
# P8: Review System + Conversations

## 1. Under-Review Status for Facilities & Pharmacies
- Add `review_reason` (text), `reviewed_at` (timestamptz), `resubmitted` (boolean default false), `resubmitted_at` (timestamptz) to both facilities and pharmacies.

## 2. Conversations System (for reports)
- `conversations` table: links a data_report to an admin-user chat.
- `conversation_messages` table: messages within a conversation.

## 3. Security (RLS)
- Users see only their own conversations; admins see all.
- Only admins can insert/close conversations.
- Both parties can insert messages into active conversations they're part of.
*/

-- ===== 1. Add review columns to facilities =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'review_reason') THEN
    ALTER TABLE facilities ADD COLUMN review_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'reviewed_at') THEN
    ALTER TABLE facilities ADD COLUMN reviewed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'resubmitted') THEN
    ALTER TABLE facilities ADD COLUMN resubmitted boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'resubmitted_at') THEN
    ALTER TABLE facilities ADD COLUMN resubmitted_at timestamptz;
  END IF;
END $$;

-- ===== 2. Add review columns to pharmacies =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'review_reason') THEN
    ALTER TABLE pharmacies ADD COLUMN review_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'reviewed_at') THEN
    ALTER TABLE pharmacies ADD COLUMN reviewed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'resubmitted') THEN
    ALTER TABLE pharmacies ADD COLUMN resubmitted boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'resubmitted_at') THEN
    ALTER TABLE pharmacies ADD COLUMN resubmitted_at timestamptz;
  END IF;
END $$;

-- ===== 3. Conversations table =====
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES data_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  admin_id uuid,
  status text NOT NULL DEFAULT 'active',
  closed_by uuid,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_conversations" ON conversations;
CREATE POLICY "select_own_conversations"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = admin_id);

DROP POLICY IF EXISTS "insert_conversations_admin" ON conversations;
CREATE POLICY "insert_conversations_admin"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "update_conversations_admin" ON conversations;
CREATE POLICY "update_conversations_admin"
ON conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ===== 4. Conversation messages table =====
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  sender_role text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_conversation_messages" ON conversation_messages;
CREATE POLICY "select_conversation_messages"
ON conversation_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_messages.conversation_id
    AND (conversations.user_id = auth.uid() OR conversations.admin_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "insert_conversation_messages" ON conversation_messages;
CREATE POLICY "insert_conversation_messages"
ON conversation_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_messages.conversation_id
    AND conversations.status = 'active'
    AND (conversations.user_id = auth.uid() OR conversations.admin_id = auth.uid())
  )
  AND auth.uid() = sender_id
);

-- ===== 5. Indexes =====
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_report_id ON conversations(report_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_id ON conversation_messages(conversation_id);
