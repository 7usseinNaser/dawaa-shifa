-- Fix all trigger functions that call log_public_activity to cast uuid parameters to text
-- The function signature expects (text, text, text, text, text, jsonb) but several triggers pass uuid directly

-- Fix on_pharmacy_status_change: NEW.id is uuid, must cast to text
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
      NEW.id::text,
      jsonb_build_object('name', NEW.name, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix on_facility_status_change: NEW.id is uuid, must cast to text
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
      NEW.id::text,
      jsonb_build_object('name', NEW.name, 'status', NEW.overall_status)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix on_department_wait_drop: NEW.facility_id is uuid, must cast to text
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
      NEW.facility_id::text,
      jsonb_build_object('department', NEW.name, 'facility', facil_name, 'waiting_count', NEW.waiting_count)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Also ensure on_medicine_availability_change casts (already fixed in previous migration, but ensure)
CREATE OR REPLACE FUNCTION public.on_medicine_availability_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  pharm_name text;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_available AND NEW.deleted_at IS NULL)
  OR (TG_OP = 'UPDATE' AND OLD.is_available IS DISTINCT FROM NEW.is_available
  AND NEW.is_available AND NEW.deleted_at IS NULL) THEN
    SELECT name INTO pharm_name FROM public.pharmacies WHERE id = NEW.pharmacy_id;
    PERFORM public.log_public_activity(
      'medicine_available',
      'توفّر دواء ' || NEW.medicine_name || ' في ' || COALESCE(pharm_name, 'صيدلية'),
      NEW.medicine_name || ' is now available at ' || COALESCE(pharm_name, 'pharmacy'),
      'pharmacy',
      NEW.pharmacy_id::text,
      jsonb_build_object('medicine', NEW.medicine_name, 'pharmacy', pharm_name, 'price', NEW.price)
    );
  END IF;
  RETURN NEW;
END;
$function$;
