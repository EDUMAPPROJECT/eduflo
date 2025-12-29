-- Create enum for seminar status
CREATE TYPE public.seminar_status AS ENUM ('recruiting', 'closed');

-- Create seminars table
CREATE TABLE public.seminars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  image_url TEXT,
  capacity INTEGER DEFAULT 30,
  status seminar_status NOT NULL DEFAULT 'recruiting',
  subject TEXT,
  target_grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seminar_applications table
CREATE TABLE public.seminar_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seminar_id UUID NOT NULL REFERENCES public.seminars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  student_grade TEXT,
  attendee_count INTEGER DEFAULT 1,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seminars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seminar_applications ENABLE ROW LEVEL SECURITY;

-- Seminars policies
CREATE POLICY "Anyone can view seminars"
ON public.seminars FOR SELECT
USING (true);

CREATE POLICY "Academy owners can insert seminars"
ON public.seminars FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.academies 
    WHERE academies.id = academy_id 
    AND academies.owner_id = auth.uid()
  )
);

CREATE POLICY "Academy owners can update their seminars"
ON public.seminars FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.academies 
    WHERE academies.id = academy_id 
    AND academies.owner_id = auth.uid()
  )
);

CREATE POLICY "Academy owners can delete their seminars"
ON public.seminars FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.academies 
    WHERE academies.id = academy_id 
    AND academies.owner_id = auth.uid()
  )
);

-- Seminar applications policies
CREATE POLICY "Users can insert their own applications"
ON public.seminar_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications"
ON public.seminar_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Academy owners can view applications for their seminars"
ON public.seminar_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.seminars s
    JOIN public.academies a ON s.academy_id = a.id
    WHERE s.id = seminar_id AND a.owner_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_seminars_updated_at
BEFORE UPDATE ON public.seminars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();