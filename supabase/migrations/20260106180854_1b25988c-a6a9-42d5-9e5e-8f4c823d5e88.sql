-- Add temporary_closed_dates column to academy_settings
ALTER TABLE public.academy_settings
ADD COLUMN temporary_closed_dates date[] DEFAULT '{}'::date[];