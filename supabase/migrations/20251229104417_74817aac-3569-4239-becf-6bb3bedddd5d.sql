-- Make phone column nullable since we're using email auth now
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the trigger function to handle email-based auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, user_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'user_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'parent')
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();