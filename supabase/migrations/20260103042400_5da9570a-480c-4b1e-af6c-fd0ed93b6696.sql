-- Create verification status enum
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Create business verifications table
CREATE TABLE public.business_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  document_url TEXT NOT NULL,
  business_name TEXT,
  business_number TEXT,
  status verification_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification
CREATE POLICY "Users can view their own verification"
ON public.business_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- Admin users can insert their verification request
CREATE POLICY "Admin users can insert verification request"
ON public.business_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));

-- Admin users can update their pending verification
CREATE POLICY "Admin users can update their pending verification"
ON public.business_verifications
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Create trigger for updated_at
CREATE TRIGGER update_business_verifications_updated_at
BEFORE UPDATE ON public.business_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-documents', 'verification-documents', false);

-- Storage policies for verification documents
CREATE POLICY "Admin users can upload verification documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can view their own verification documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);