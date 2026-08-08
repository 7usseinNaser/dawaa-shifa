/*
# Link conversations to suggestions/bug reports + notification on status change

## Changes
1. Add `suggestion_id` and `bug_report_id` columns to `conversations` table
   so a conversation can be linked to a specific suggestion or bug report
   (not just a general report_id).
2. Add RLS policies allowing:
   - The suggestion/bug report owner to SELECT their linked conversation
   - Admins to SELECT all conversations
   - Both parties to INSERT messages into the linked conversation
3. Add a trigger function `notify_suggestion_status_change()` that inserts a
   notification row into the `notifications` table when a suggestion's status
   changes, addressed to the suggestion's owner.

## Security
- Owner-scoped SELECT on conversations (by user_id or suggestion/bug report ownership chain)
- Admin SELECT on all conversations
- INSERT on conversation_messages: sender must be conversation participant or admin
*/

-- 1. Add linking columns to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS suggestion_id uuid REFERENCES suggestions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bug_report_id uuid REFERENCES bug_reports(id) ON DELETE SET NULL;

-- 2. Owner can SELECT conversations linked to their suggestions/bug reports
DROP POLICY IF EXISTS "owner_select_conversations" ON conversations;
CREATE POLICY "owner_select_conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR is_admin()
  OR (
    suggestion_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM suggestions s WHERE s.id = conversations.suggestion_id AND s.user_id = auth.uid())
  )
  OR (
    bug_report_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM bug_reports b WHERE b.id = conversations.bug_report_id AND b.reporter_id = auth.uid())
  )
);

-- 3. Allow linked conversation owner to INSERT messages
DROP POLICY IF EXISTS "owner_insert_conversation_messages" ON conversation_messages;
CREATE POLICY "owner_insert_conversation_messages"
ON conversation_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_messages.conversation_id
    AND (
      c.user_id = auth.uid()
      OR c.admin_id = auth.uid()
      OR is_admin()
      OR (c.suggestion_id IS NOT NULL AND EXISTS (SELECT 1 FROM suggestions s WHERE s.id = c.suggestion_id AND s.user_id = auth.uid()))
      OR (c.bug_report_id IS NOT NULL AND EXISTS (SELECT 1 FROM bug_reports b WHERE b.id = c.bug_report_id AND b.reporter_id = auth.uid()))
    )
  )
);

-- 4. Allow linked conversation owner to SELECT messages
DROP POLICY IF EXISTS "owner_select_conversation_messages" ON conversation_messages;
CREATE POLICY "owner_select_conversation_messages"
ON conversation_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_messages.conversation_id
    AND (
      c.user_id = auth.uid()
      OR c.admin_id = auth.uid()
      OR is_admin()
      OR (c.suggestion_id IS NOT NULL AND EXISTS (SELECT 1 FROM suggestions s WHERE s.id = c.suggestion_id AND s.user_id = auth.uid()))
      OR (c.bug_report_id IS NOT NULL AND EXISTS (SELECT 1 FROM bug_reports b WHERE b.id = c.bug_report_id AND b.reporter_id = auth.uid()))
    )
  )
);

-- 5. Trigger: notify suggestion owner on status change
CREATE OR REPLACE FUNCTION notify_suggestion_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, unread)
    VALUES (
      NEW.user_id,
      'info',
      CASE NEW.status
        WHEN 'reviewing' THEN 'اقتراحك قيد المراجعة'
        WHEN 'implemented' THEN 'تم تنفيذ اقتراحك'
        WHEN 'rejected' THEN 'تم رفض اقتراحك'
        ELSE 'تم تحديث حالة اقتراحك'
      END,
      CASE NEW.status
        WHEN 'reviewing' THEN 'اقتراحك "' || COALESCE(NEW.title, '') || '" الآن قيد المراجعة'
        WHEN 'implemented' THEN 'تم تنفيذ اقتراحك "' || COALESCE(NEW.title, '') || '"، شكراً لمساهمتك'
        WHEN 'rejected' THEN 'لم يتم قبول اقتراحك "' || COALESCE(NEW.title, '') || '" في الوقت الحالي'
        ELSE 'تم تحديث حالة اقتراحك "' || COALESCE(NEW.title, '') || '"'
      END,
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_suggestion_status_change ON suggestions;
CREATE TRIGGER on_suggestion_status_change
  AFTER UPDATE ON suggestions
  FOR EACH ROW
  EXECUTE FUNCTION notify_suggestion_status_change();

-- 6. Trigger: notify bug report owner on status change
CREATE OR REPLACE FUNCTION notify_bug_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.reporter_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, unread)
    VALUES (
      NEW.reporter_id,
      'info',
      CASE NEW.status
        WHEN 'reviewing' THEN 'بلاغك قيد المراجعة'
        WHEN 'resolved' THEN 'تم حل بلاغك'
        ELSE 'تم تحديث حالة بلاغك'
      END,
      CASE NEW.status
        WHEN 'reviewing' THEN 'بلاغك التقني الآن قيد المراجعة من قبل الإدارة'
        WHEN 'resolved' THEN 'تم حل بلاغك التقني، شكراً لتواصلك'
        ELSE 'تم تحديث حالة بلاغك التقني'
      END,
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bug_report_status_change ON bug_reports;
CREATE TRIGGER on_bug_report_status_change
  AFTER UPDATE ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_bug_report_status_change();
