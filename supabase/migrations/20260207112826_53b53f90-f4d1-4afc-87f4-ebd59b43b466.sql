-- Allow academy members/owners/authors to delete seminar applications
CREATE POLICY "Academy members can delete seminar applications"
ON public.seminar_applications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM seminars s
    WHERE s.id = seminar_applications.seminar_id
    AND has_academy_permission(auth.uid(), s.academy_id, 'manage_seminars'::text)
  )
);

CREATE POLICY "Seminar authors can delete applications"
ON public.seminar_applications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM seminars s
    WHERE s.id = seminar_applications.seminar_id
    AND s.author_id = auth.uid()
  )
);

CREATE POLICY "Super admins can delete all applications"
ON public.seminar_applications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.is_super_admin = true
  )
);