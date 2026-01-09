-- Drop existing INSERT policy for academies
DROP POLICY IF EXISTS "Admins can create their own academy" ON public.academies;

-- Create new INSERT policy that allows:
-- 1. Regular admins to create one academy with their own owner_id
-- 2. Super admins to create unlimited academies (with or without owner_id)
CREATE POLICY "Admins can create academies" 
ON public.academies 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Super admins can create academies for anyone (or with null owner_id)
  public.is_super_admin(auth.uid()) 
  OR 
  -- Regular admins can only create academy for themselves
  (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
);