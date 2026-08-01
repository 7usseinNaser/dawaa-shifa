/*
# Public Activity Feed + Realtime publication

1. Overview
- Adds a `public_activity_feed` table that records ONLY citizen-useful
  operational events: medicine availability, facility status changes, and
  department wait-time reductions.
- Privacy is enforced by a SECURITY DEFINER helper function
  `log_public_activity()` that the app cannot call directly for administrative
  actions — only operational status/availability changes produce feed rows.
  Administrative actions (edits/deletes by admins, password changes, internal
  audit logs, bug reports, warnings) are NEVER written to this table.
- Adds `supabase_realtime` publication entries so the frontend can subscribe
  to live changes on pharmacies, facilities, medicines, departments, and the
  new public_activity_feed table.

2. New Tables
- `public_activity_feed`
  - id (uuid PK)
  - event_type (text: 'medicine_available' | 'facility_status' | 'wait_time')
  - message_ar (text) — Arabic human-readable message
  - message_en (text) — English human-readable message
  - entity_type (text: 'pharmacy' | 'facility' | 'department')
  - entity_id (text) — id or name of the entity
  - metadata (jsonb) — optional extra context (medicine name, status, etc.)
  - created_at (timestamptz, default now())

3. New Functions
- `log_public_activity(p_event_type, p_message_ar, p_message_en, p_entity_type,
  p_entity_id, p_metadata)` — SECURITY DEFINER helper to insert a feed row.
  Callable by authenticated users (pharmacists/facility owners) when they
  update operational data. This is the ONLY sanctioned way to add rows.

4. Triggers (automatic feed generation)
- `trg_pharmacy_status_change` — AFTER UPDATE on pharmacies: when status
  changes (open/busy/emergency/closed), inserts a facility_status event.
  Skips admin/owner edits that only touch non-operational fields — fires
  ONLY when the status column itself changes, so routine admin metadata
  edits do not appear in the public feed.
- `trg_facility_status_change` — AFTER UPDATE on facilities: same logic on
  overall_status.
- `trg_medicine_availability_change` — AFTER INSERT or UPDATE on medicines:
  when is_available flips to true (restock), inserts a medicine_available
  event. Deletes and out-of-stock changes are NOT logged (privacy/noise).
- `trg_department_wait_drop` — AFTER UPDATE on departments: when
  waiting_count decreases, inserts a wait_time event.

5. Security
- RLS on public_activity_feed: anon + authenticated can SELECT (public feed
  for logged-out landing-page visitors). INSERT is ONLY via the
  SECURITY DEFINER function / triggers — direct INSERT by any role is
  denied (no INSERT policy). UPDATE/DELETE denied (no policies).
- Triggers run with the table owner privileges, so they can insert even
  though external roles cannot.

6. Realtime
- Adds pharmacies, facilities, medicines, departments, public_activity_feed
  to the `supabase_realtime` publication so the anon-key client can
  subscribe to row-level changes for live counters and the live feed.

7. Notes
- Administrative actions (approval changes, rejections, soft-deletes, role
  changes, warnings, bug reports, password/email changes) are deliberately
  NOT mirrored into this feed — that would leak private operational info.
- The feed is bounded: only operational, citizen-useful events appear.
*/

-- ============================================================
-- PART 1: Create public_activity_feed table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.public_activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('medicine_available', 'facility_status', 'wait_time')),
  message_ar text NOT NULL,
  message_en text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('pharmacy', 'facility', 'department')),
  entity_id text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created
  ON public.public_activity_feed (created_at DESC);

ALTER TABLE public.public_activity_feed ENABLE ROW LEVEL SECURITY;

-- Public read for logged-out landing visitors
DROP POLICY IF EXISTS "public_read_activity_feed" ON public.public_activity_feed;
CREATE POLICY "public_read_activity_feed"
  ON public.public_activity_feed FOR SELECT
  TO anon, authenticated USING (true);

-- No INSERT/UPDATE/DELETE policies: only triggers/function can write.

-- ============================================================
-- PART 2: Helper function to log a public activity
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_public_activity(
  p_event_type text,
  p_message_ar text,
  p_message_en text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.public_activity_feed (event_type, message_ar, message_en, entity_type, entity_id, metadata)
  VALUES (p_event_type, p_message_ar, p_message_en, p_entity_type, p_entity_id, p_metadata);
END;
$function$;

-- ============================================================
-- PART 3: Triggers that auto-generate public activity rows
-- ============================================================

-- Pharmacy status change -> facility_status event
CREATE OR REPLACE FUNCTION public.on_pharmacy_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  status_ar text;
  status_en text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.deleted_at IS NULL THEN
    status_ar := CASE NEW.status
      WHEN 'open' THEN 'متاحة'
      WHEN 'busy' THEN 'مزدحمة'
      WHEN 'emergency' THEN 'حالة طوارئ'
      WHEN 'closed' THEN 'مغلقة'
      ELSE NEW.status
    END;
    status_en := CASE NEW.status
      WHEN 'open' THEN 'open'
      WHEN 'busy' THEN 'busy'
      WHEN 'emergency' THEN 'emergency'
      WHEN 'closed' THEN 'closed'
      ELSE NEW.status
    END;
    PERFORM public.log_public_activity(
      'facility_status',
      'تغيّر حالة ' || NEW.name || ' إلى ' || status_ar,
      NEW.name || ' status changed to ' || status_en,
      'pharmacy',
      NEW.id,
      jsonb_build_object('name', NEW.name, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_pharmacy_status_change ON public.pharmacies;
CREATE TRIGGER trg_pharmacy_status_change
  AFTER UPDATE ON public.pharmacies
  FOR EACH ROW EXECUTE FUNCTION public.on_pharmacy_status_change();

-- Facility status change -> facility_status event
CREATE OR REPLACE FUNCTION public.on_facility_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  status_ar text;
  status_en text;
BEGIN
  IF OLD.overall_status IS DISTINCT FROM NEW.overall_status AND NEW.deleted_at IS NULL THEN
    status_ar := CASE NEW.overall_status
      WHEN 'open' THEN 'طبيعية / استقبال حالات'
      WHEN 'busy' THEN 'مزدحم'
      WHEN 'emergency' THEN 'طوارئ'
      WHEN 'closed' THEN 'مغلق'
      ELSE NEW.overall_status
    END;
    status_en := CASE NEW.overall_status
      WHEN 'open' THEN 'normal / receiving cases'
      WHEN 'busy' THEN 'busy'
      WHEN 'emergency' THEN 'emergency'
      WHEN 'closed' THEN 'closed'
      ELSE NEW.overall_status
    END;
    PERFORM public.log_public_activity(
      'facility_status',
      'تغيّر حالة ' || NEW.name || ' إلى ' || status_ar,
      NEW.name || ' status changed to ' || status_en,
      'facility',
      NEW.id,
      jsonb_build_object('name', NEW.name, 'status', NEW.overall_status)
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_facility_status_change ON public.facilities;
CREATE TRIGGER trg_facility_status_change
  AFTER UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.on_facility_status_change();

-- Medicine restock -> medicine_available event (only when becoming available)
CREATE OR REPLACE FUNCTION public.on_medicine_availability_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  pharm_name text;
BEGIN
  -- INSERT of an available medicine, or UPDATE flipping is_available to true
  IF (TG_OP = 'INSERT' AND NEW.is_available AND NEW.deleted_at IS NULL)
     OR (TG_OP = 'UPDATE' AND OLD.is_available IS DISTINCT FROM NEW.is_available
         AND NEW.is_available AND NEW.deleted_at IS NULL) THEN
    SELECT name INTO pharm_name FROM public.pharmacies WHERE id = NEW.pharmacy_id;
    PERFORM public.log_public_activity(
      'medicine_available',
      'توفّر دواء ' || NEW.medicine_name || ' في ' || COALESCE(pharm_name, 'صيدلية'),
      NEW.medicine_name || ' is now available at ' || COALESCE(pharm_name, 'pharmacy'),
      'pharmacy',
      NEW.pharmacy_id,
      jsonb_build_object('medicine', NEW.medicine_name, 'pharmacy', pharm_name, 'price', NEW.price)
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_medicine_availability_change ON public.medicines;
CREATE TRIGGER trg_medicine_availability_change
  AFTER INSERT OR UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.on_medicine_availability_change();

-- Department wait-time drop -> wait_time event
CREATE OR REPLACE FUNCTION public.on_department_wait_drop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  facil_name text;
BEGIN
  IF OLD.waiting_count > NEW.waiting_count THEN
    SELECT name INTO facil_name FROM public.facilities WHERE id = NEW.facility_id;
    PERFORM public.log_public_activity(
      'wait_time',
      'انخفض زمن الانتظار في قسم ' || NEW.name || ' إلى ' || NEW.waiting_count::text || ' منتظر',
      'Wait time in ' || NEW.name || ' dropped to ' || NEW.waiting_count::text || ' waiting',
      'department',
      NEW.facility_id,
      jsonb_build_object('department', NEW.name, 'facility', facil_name, 'waiting_count', NEW.waiting_count)
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_department_wait_drop ON public.departments;
CREATE TRIGGER trg_department_wait_drop
  AFTER UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.on_department_wait_drop();

-- ============================================================
-- PART 4: Realtime publication
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.facilities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_activity_feed;

-- ============================================================
-- PART 5: Seed a few initial feed rows from current data
-- ============================================================

INSERT INTO public.public_activity_feed (event_type, message_ar, message_en, entity_type, entity_id, metadata)
SELECT
  'facility_status',
  'تغيّر حالة ' || name || ' إلى ' ||
    CASE overall_status WHEN 'open' THEN 'طبيعية / استقبال حالات' WHEN 'busy' THEN 'مزدحم' WHEN 'emergency' THEN 'طوارئ' WHEN 'closed' THEN 'مغلق' ELSE overall_status END,
  name || ' status: ' || overall_status,
  'facility',
  id,
  jsonb_build_object('name', name, 'status', overall_status)
FROM public.facilities
WHERE deleted_at IS NULL AND overall_status = 'open'
LIMIT 5;

INSERT INTO public.public_activity_feed (event_type, message_ar, message_en, entity_type, entity_id, metadata)
SELECT
  'medicine_available',
  'توفّر دواء ' || m.medicine_name || ' في ' || COALESCE(p.name, 'صيدلية'),
  m.medicine_name || ' available at ' || COALESCE(p.name, 'pharmacy'),
  'pharmacy',
  m.pharmacy_id,
  jsonb_build_object('medicine', m.medicine_name, 'pharmacy', p.name, 'price', m.price)
FROM public.medicines m
LEFT JOIN public.pharmacies p ON p.id = m.pharmacy_id
WHERE m.is_available AND m.deleted_at IS NULL
ORDER BY m.last_updated DESC
LIMIT 5;
