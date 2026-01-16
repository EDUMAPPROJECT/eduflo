-- Create random word arrays for nickname generation
CREATE OR REPLACE FUNCTION public.generate_random_nickname()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  adjectives text[] := ARRAY['멋진', '훌륭한', '행복한', '즐거운', '열정적인', '친절한', '성실한', '밝은', '용감한', '지혜로운', '부지런한', '따뜻한', '활발한', '창의적인', '당당한', '유쾌한', '사랑스러운', '근면한', '정직한', '겸손한'];
  nouns text[] := ARRAY['선생님', '교육자', '멘토', '코치', '가이드', '리더', '안내자', '조력자', '동반자', '파트너', '지도자', '스승', '강사', '튜터', '마스터', '프로', '전문가', '달인', '명인', '선배'];
  adj text;
  noun text;
  suffix text;
BEGIN
  adj := adjectives[1 + floor(random() * array_length(adjectives, 1))::int];
  noun := nouns[1 + floor(random() * array_length(nouns, 1))::int];
  suffix := LPAD((floor(random() * 10000))::text, 4, '0');
  RETURN adj || noun || suffix;
END;
$$;

-- Update the handle_new_user function to use random nickname for admin accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    IF v_role = 'admin' THEN
      -- Use random word combination for admin accounts
      v_default_name := public.generate_random_nickname();
    ELSE
      -- Generate a unique 4-digit suffix from user id for parents
      v_unique_suffix := LPAD(MOD(('x' || SUBSTR(NEW.id::text, 1, 8))::bit(32)::int, 10000)::text, 4, '0');
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
$$;