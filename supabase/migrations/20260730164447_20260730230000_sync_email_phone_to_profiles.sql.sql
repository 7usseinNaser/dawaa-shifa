/*
# Sync email & phone from auth.users to profiles

1. Overview
- The existing `set_new_user_verified()` trigger sets role and verified status on
  new profile rows but does NOT copy email or phone from auth.users into the
  profiles table. As a result, profiles.email and profiles.phone remain NULL
  for every user.
- This migration updates the trigger function to also copy email and phone
  from auth.users into profiles on INSERT, and adds a second trigger that
  keeps email/phone in sync on UPDATE of auth.users (e.g. when a user changes
  their email).
- It also backfills all existing profiles rows with the correct email and
  phone values from auth.users.

2. Modified Functions
- `set_new_user_verified()` — now also copies email and phone from auth.users
  into the NEW profile row.
- `sync_profile_email_phone()` — NEW trigger function that updates
  profiles.email and profiles.phone whenever the corresponding auth.users row
  changes (email or phone).

3. Modified Tables
- `profiles` — no schema changes (email and phone columns already exist).
  Data is backfilled from auth.users.

4. Triggers
- `on_auth_user_created` — existing trigger on auth.users AFTER INSERT,
  calls `set_new_user_verified()` (updated function, same trigger).
- `on_auth_user_updated` — NEW trigger on auth.users AFTER UPDATE,
  calls `sync_profile_email_phone()`.

5. Backfill
- UPDATE profiles SET email = auth.users.email, phone = auth.users.phone
  for all existing rows where there is a matching auth.users row.

6. Security
- Both functions are SECURITY DEFINER so they can read auth.users (which is
  not accessible to the anon/authenticated roles).
- No RLS changes needed.

7. Notes
- phone in auth.users is typically NULL unless phone auth is used, but we
  still copy it for completeness.
- The backfill is safe to re-run: it only updates rows where email IS NULL
  or phone IS NULL, and always sets from the authoritative auth.users value.
*/

-- ============================================================
-- PART 1: Update set_new_user_verified to also copy email + phone
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_new_user_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_email text;
  v_phone text;
  v_authorized text := 'hussein7.7naser@gmail.com';
BEGIN
  SELECT email, phone INTO v_email, v_phone FROM auth.users WHERE id = NEW.id;

  -- Copy email and phone from auth.users into the profile row
  NEW.email := v_email;
  NEW.phone := COALESCE(v_phone, NEW.phone);

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

-- ============================================================
-- PART 2: New function to sync email/phone on auth.users UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_profile_email_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.profiles
    SET email = NEW.email,
        phone = COALESCE(NEW.phone, public.profiles.phone)
    WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

-- Create the UPDATE trigger on auth.users (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.phone IS DISTINCT FROM NEW.phone)
  EXECUTE FUNCTION public.sync_profile_email_phone();

-- ============================================================
-- PART 3: Backfill existing profiles with email & phone from auth.users
-- ============================================================

UPDATE public.profiles p
  SET email = au.email,
      phone = COALESCE(au.phone, p.phone)
  FROM auth.users au
  WHERE p.id = au.id
    AND (p.email IS NULL OR p.phone IS NULL);
