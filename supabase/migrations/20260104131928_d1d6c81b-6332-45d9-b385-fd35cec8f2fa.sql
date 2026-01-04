-- Add policy for super admin to view all verifications
CREATE POLICY "Super admins can view all verifications"
ON public.business_verifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add policy for super admin to update any verification status
CREATE POLICY "Super admins can update verification status"
ON public.business_verifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  AND EXISTS (
    SELECT 1 FROM public.academies
    WHERE owner_id = auth.uid()
  )
);

-- Add policy for super admin to view verification documents
CREATE POLICY "Super admins can view verification documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  AND EXISTS (
    SELECT 1 FROM public.academies
    WHERE owner_id = auth.uid()
  )
);