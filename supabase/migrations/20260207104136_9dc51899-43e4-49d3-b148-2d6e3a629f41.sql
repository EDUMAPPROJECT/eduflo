-- Allow academy members to update seminar application status (for approval workflow)
CREATE POLICY "Academy members can update seminar applications"
ON public.seminar_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM seminars s
    WHERE s.id = seminar_applications.seminar_id
    AND has_academy_permission(auth.uid(), s.academy_id, 'manage_seminars'::text)
  )
);

-- Allow seminar authors to update applications
CREATE POLICY "Seminar authors can update applications"
ON public.seminar_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM seminars s
    WHERE s.id = seminar_applications.seminar_id
    AND s.author_id = auth.uid()
  )
);

-- Allow super admins to update all applications
CREATE POLICY "Super admins can update all applications"
ON public.seminar_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.is_super_admin = true
  )
);