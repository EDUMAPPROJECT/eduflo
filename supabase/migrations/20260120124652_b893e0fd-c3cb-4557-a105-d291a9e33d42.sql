-- Create children table for managing child profiles
CREATE TABLE public.children (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  name TEXT NOT NULL,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create child connection requests table
CREATE TABLE public.child_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  connection_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Add child_id to class_enrollments for per-child tracking
ALTER TABLE public.class_enrollments ADD COLUMN child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

-- Add child_id to manual_schedules for per-child tracking
ALTER TABLE public.manual_schedules ADD COLUMN child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

-- Enable RLS on children table
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Enable RLS on child_connections table
ALTER TABLE public.child_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for children table
CREATE POLICY "Users can view their own children"
ON public.children FOR SELECT
USING (auth.uid() = parent_id);

CREATE POLICY "Users can create their own children"
ON public.children FOR INSERT
WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Users can update their own children"
ON public.children FOR UPDATE
USING (auth.uid() = parent_id);

CREATE POLICY "Users can delete their own children"
ON public.children FOR DELETE
USING (auth.uid() = parent_id);

-- RLS policies for child_connections table
CREATE POLICY "Users can view their own connection requests"
ON public.child_connections FOR SELECT
USING (auth.uid() = parent_id);

CREATE POLICY "Users can create their own connection requests"
ON public.child_connections FOR INSERT
WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Users can update their own connection requests"
ON public.child_connections FOR UPDATE
USING (auth.uid() = parent_id);

CREATE POLICY "Users can delete their own connection requests"
ON public.child_connections FOR DELETE
USING (auth.uid() = parent_id);

-- Function to generate connection code
CREATE OR REPLACE FUNCTION public.generate_connection_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    
    -- Check for duplicates
    SELECT EXISTS(SELECT 1 FROM child_connections WHERE connection_code = new_code AND status = 'pending') INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Update handle_new_user to use random nickname for all users (not just admin)
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
    WHEN v_role_text IN ('admin', 'parent') THEN v_role_text::app_role
    ELSE 'parent'::app_role
  END;

  -- Generate random nickname for all users if user_name is not provided
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

-- Add realtime for child_connections
ALTER PUBLICATION supabase_realtime ADD TABLE public.child_connections;