-- Allow super admins to update any academy
CREATE POLICY "Super admins can update any academy"
ON public.academies
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Allow super admins to delete any academy
CREATE POLICY "Super admins can delete any academy"
ON public.academies
FOR DELETE
USING (is_super_admin(auth.uid()));