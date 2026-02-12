-- Create a security definer function to get seminar application count
-- This bypasses RLS so any authenticated user can see the total count
CREATE OR REPLACE FUNCTION public.get_seminar_application_count(_seminar_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(count(*)::integer, 0)
  FROM public.seminar_applications
  WHERE seminar_id = _seminar_id;
$$;