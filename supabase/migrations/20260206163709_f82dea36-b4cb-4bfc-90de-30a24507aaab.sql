
-- Add status column to seminar_applications for approval workflow
ALTER TABLE public.seminar_applications 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed';

-- Allow seminar authors (including super admins) to view applications
CREATE POLICY "Seminar authors can view applications"
ON public.seminar_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM seminars s
    WHERE s.id = seminar_applications.seminar_id
    AND s.author_id = auth.uid()
  )
);

-- Allow super admins to view all applications
CREATE POLICY "Super admins can view all applications"
ON public.seminar_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.is_super_admin = true
  )
);

-- Allow academy owners to view seminar applications
CREATE POLICY "Academy owners can view seminar applications"
ON public.seminar_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM seminars s
    JOIN academies a ON a.id = s.academy_id
    WHERE s.id = seminar_applications.seminar_id
    AND a.owner_id = auth.uid()
  )
);
