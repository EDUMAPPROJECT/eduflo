
-- Change default status of seminar_applications from 'confirmed' to 'pending'
ALTER TABLE public.seminar_applications ALTER COLUMN status SET DEFAULT 'pending';
