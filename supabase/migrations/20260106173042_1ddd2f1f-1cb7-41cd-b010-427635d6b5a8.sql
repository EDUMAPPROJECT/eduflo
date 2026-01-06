-- Update the handle_new_user function to generate unique nicknames
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_user_name text;
  v_role_text text;
  v_role app_role;
  v_default_name text;
  v_unique_suffix text;
BEGIN
  v_phone := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), '');
  v_user_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'user_name', '')), '');
  v_role_text := btrim(COALESCE(NEW.raw_user_meta_data ->> 'role', ''));

  v_role := CASE
    WHEN v_role_text IN ('admin', 'parent') THEN v_role_text::app_role
    ELSE 'parent'::app_role
  END;

  -- Generate unique default nickname if user_name is not provided
  IF v_user_name IS NULL THEN
    -- Generate a unique 4-digit suffix from user id
    v_unique_suffix := LPAD(MOD(('x' || SUBSTR(NEW.id::text, 1, 8))::bit(32)::int, 10000)::text, 4, '0');
    
    IF v_role = 'admin' THEN
      v_default_name := '원장님#' || v_unique_suffix;
    ELSE
      v_default_name := '학부모#' || v_unique_suffix;
    END IF;
    
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
$function$;