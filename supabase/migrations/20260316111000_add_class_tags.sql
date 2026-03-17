-- Add tags column to classes for per-class tags
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';