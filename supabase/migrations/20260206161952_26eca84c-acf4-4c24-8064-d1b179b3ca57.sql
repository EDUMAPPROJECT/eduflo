
-- Add confirmation_mode and completion_message to seminars
ALTER TABLE public.seminars ADD COLUMN IF NOT EXISTS confirmation_mode text NOT NULL DEFAULT 'auto';
ALTER TABLE public.seminars ADD COLUMN IF NOT EXISTS completion_message text;
