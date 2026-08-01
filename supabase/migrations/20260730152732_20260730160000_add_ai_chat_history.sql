/*
# Add AI pharmacist chat history

1. New Tables
- `ai_chat_messages` — persists conversations between users and the AI pharmacist assistant.
  Columns: id, user_id (nullable, defaults to auth.uid()), role (user/assistant), content, created_at.

2. Security
- Enable RLS on ai_chat_messages.
- Authenticated users can SELECT/INSERT/UPDATE/DELETE only their own rows.
- user_id defaults to auth.uid() so inserts omitting it still pass the WITH CHECK.
*/

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_chats" ON ai_chat_messages;
CREATE POLICY "select_own_ai_chats" ON ai_chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_chats" ON ai_chat_messages;
CREATE POLICY "insert_own_ai_chats" ON ai_chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ai_chats" ON ai_chat_messages;
CREATE POLICY "update_own_ai_chats" ON ai_chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ai_chats" ON ai_chat_messages;
CREATE POLICY "delete_own_ai_chats" ON ai_chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user_created ON ai_chat_messages(user_id, created_at);
