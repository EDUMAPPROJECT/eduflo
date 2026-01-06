-- Create academy_settings table for consultation scheduling
CREATE TABLE public.academy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academy_id UUID NOT NULL UNIQUE,
  consultation_start_time TEXT NOT NULL DEFAULT '10:00',
  consultation_end_time TEXT NOT NULL DEFAULT '22:00',
  slot_duration INTEGER NOT NULL DEFAULT 30,
  break_start_time TEXT,
  break_end_time TEXT,
  closed_days INTEGER[] DEFAULT '{0,6}'::INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academy_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view academy settings"
ON public.academy_settings
FOR SELECT
USING (true);

CREATE POLICY "Academy owners can insert their settings"
ON public.academy_settings
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM academies
  WHERE academies.id = academy_settings.academy_id
  AND academies.owner_id = auth.uid()
));

CREATE POLICY "Academy owners can update their settings"
ON public.academy_settings
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM academies
  WHERE academies.id = academy_settings.academy_id
  AND academies.owner_id = auth.uid()
));

-- Create consultation_reservations table
CREATE TABLE public.consultation_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academy_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  student_grade TEXT,
  reservation_date DATE NOT NULL,
  reservation_time TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

-- Enable RLS
ALTER TABLE public.consultation_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consultation_reservations
CREATE POLICY "Parents can view their reservations"
ON public.consultation_reservations
FOR SELECT
USING (auth.uid() = parent_id);

CREATE POLICY "Academy owners can view reservations for their academies"
ON public.consultation_reservations
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM academies
  WHERE academies.id = consultation_reservations.academy_id
  AND academies.owner_id = auth.uid()
));

CREATE POLICY "Parents can insert reservations"
ON public.consultation_reservations
FOR INSERT
WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can cancel their pending reservations"
ON public.consultation_reservations
FOR UPDATE
USING (auth.uid() = parent_id AND status = 'pending');

CREATE POLICY "Academy owners can update reservation status"
ON public.consultation_reservations
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM academies
  WHERE academies.id = consultation_reservations.academy_id
  AND academies.owner_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_academy_settings_updated_at
BEFORE UPDATE ON public.academy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultation_reservations_updated_at
BEFORE UPDATE ON public.consultation_reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();