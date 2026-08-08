/*
# Admin auto-promote + Extend notifications schema

1. Overview
- Updates set_new_user_verified() trigger to AUTO-PROMOTE hussein7.7naser@gmail.com
  to role='admin' on ANY signup, regardless of the role selected in the frontend.
- Adds columns to the existing `notifications` table: content, expires_at,
  max_views_per_user, is_active, created_by, updated_at.
- Creates `user_notification_views` table for per-user view tracking and dismissals.
- Adds RLS policies for both tables.

2. Modified Tables
- `notifications`: added columns content, expires_at, max_views_per_user, is_active,
  created_by, updated_at. The existing `body` column is kept for backward compat.
- `user_notification_views`: new table.

3. New Tables
- `user_notification_views`
  - id (uuid PK)
  - user_id (uuid NOT NULL DEFAULT auth.uid(), FK to auth.users ON DELETE CASCADE)
  - notification_id (uuid NOT NULL, FK to notifications ON DELETE CASCADE)
  - view_count (integer, default 1)
  - is_dismissed (boolean, default false)
  - last_viewed_at (timestamptz, default now())
  - UNIQUE(user_id, notification_id)

4. Security
- RLS on notifications: authenticated can SELECT active non-expired; admin-only INSERT/UPDATE/DELETE.
- RLS on user_notification_views: users can SELECT/INSERT/UPDATE only their own rows.

5. Notes
- max_views_per_user = NULL means unlimited views within expiry window.
- expires_at = NULL means notification never expires (until is_active = false).
*/

-- ============================================================
-- PART 1: Update admin trigger to auto-promote authorized email
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_new_user_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_email text;
  v_authorized text := 'hussein7.7naser@gmail.com';
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;

  IF v_email IS NOT NULL AND lower(v_email) = lower(v_authorized) THEN
    NEW.role := 'admin';
    NEW.verified := true;
  ELSE
    IF NEW.role = 'admin' THEN
      NEW.role := 'citizen';
    END IF;
    IF NEW.role = 'admin' THEN
      NEW.verified := true;
    ELSE
      NEW.verified := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_email text;
  v_authorized text := 'hussein7.7naser@gmail.com';
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;

  IF v_email IS NOT NULL AND lower(v_email) = lower(v_authorized) THEN
    NEW.role := 'admin';
  ELSEIF NEW.role = 'admin' THEN
    NEW.role := 'citizen';
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- PART 2: Extend notifications table with new columns
-- ============================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_views_per_user integer,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill content from body for existing rows
UPDATE public.notifications SET content = body WHERE content IS NULL AND body IS NOT NULL;

-- Add CHECK constraint on type (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
      CHECK (type IN ('info', 'warning', 'emergency'));
  END IF;
END $$;

-- ============================================================
-- PART 3: RLS policies for notifications
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_active_notifications" ON public.notifications;
CREATE POLICY "select_active_notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "admin_insert_notifications" ON public.notifications;
CREATE POLICY "admin_insert_notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_notifications" ON public.notifications;
CREATE POLICY "admin_update_notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "admin_delete_notifications" ON public.notifications;
CREATE POLICY "admin_delete_notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============================================================
-- PART 4: Create user_notification_views table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_notification_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  view_count integer NOT NULL DEFAULT 1,
  is_dismissed boolean NOT NULL DEFAULT false,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

ALTER TABLE public.user_notification_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_views" ON public.user_notification_views;
CREATE POLICY "select_own_views"
  ON public.user_notification_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_views" ON public.user_notification_views;
CREATE POLICY "insert_own_views"
  ON public.user_notification_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_views" ON public.user_notification_views;
CREATE POLICY "update_own_views"
  ON public.user_notification_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PART 5: Indexes + updated_at trigger
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notifications_active_expires
  ON public.notifications (is_active, expires_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_views_user_notif
  ON public.user_notification_views (user_id, notification_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
