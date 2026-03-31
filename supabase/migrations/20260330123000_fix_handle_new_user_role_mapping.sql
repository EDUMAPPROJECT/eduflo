-- Fix role mapping for new auth users.
-- Previously, handle_new_user() only allowed 'admin' and 'parent',
-- causing 'student' signups to be saved as 'parent'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone text;
  v_user_name text;
  v_role_text text;
  v_role app_role;
  v_default_name text;
BEGIN
  v_phone := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), '');
  v_user_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'user_name', '')), '');
  v_role_text := btrim(COALESCE(NEW.raw_user_meta_data ->> 'role', ''));

  v_role := CASE
    WHEN v_role_text IN ('admin', 'parent', 'student') THEN v_role_text::app_role
    ELSE 'parent'::app_role
  END;

  IF v_user_name IS NULL THEN
    v_default_name := public.generate_random_nickname();
    v_user_name := v_default_name;
  END IF;

  INSERT INTO public.profiles (id, phone, email, user_name)
  VALUES (
    NEW.id,
    v_phone,
    NEW.email,
    v_user_name
  )
  ON CONFLICT (id) DO UPDATE
  SET phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      user_name = COALESCE(profiles.user_name, EXCLUDED.user_name),
      updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

-- Backfill existing users where role metadata says student/admin/parent
-- but user_roles is inconsistent.
UPDATE public.user_roles ur
SET role = mapped.role::app_role
FROM (
  SELECT
    au.id AS user_id,
    CASE
      WHEN btrim(COALESCE(au.raw_user_meta_data ->> 'role', '')) IN ('admin', 'parent', 'student')
        THEN btrim(COALESCE(au.raw_user_meta_data ->> 'role', ''))
      ELSE NULL
    END AS role
  FROM auth.users au
) AS mapped
WHERE ur.user_id = mapped.user_id
  AND mapped.role IS NOT NULL
  AND ur.role::text <> mapped.role;
