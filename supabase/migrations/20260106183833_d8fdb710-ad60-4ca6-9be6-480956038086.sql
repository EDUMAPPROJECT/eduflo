-- Create profile_views table to track academy profile views
CREATE TABLE public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academy_id UUID NOT NULL,
  viewer_id UUID,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_profile_views_academy_id ON public.profile_views(academy_id);
CREATE INDEX idx_profile_views_viewed_at ON public.profile_views(viewed_at);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert profile views (for tracking)
CREATE POLICY "Anyone can insert profile views" 
ON public.profile_views 
FOR INSERT 
WITH CHECK (true);

-- Academy owners can view their profile views
CREATE POLICY "Academy owners can view their profile views" 
ON public.profile_views 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM academies 
  WHERE academies.id = profile_views.academy_id 
  AND academies.owner_id = auth.uid()
));