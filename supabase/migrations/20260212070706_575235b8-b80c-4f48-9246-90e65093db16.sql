-- Allow super admins to insert seminar applications manually
CREATE POLICY "Super admins can insert applications"
ON public.seminar_applications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.is_super_admin = true
  )
);