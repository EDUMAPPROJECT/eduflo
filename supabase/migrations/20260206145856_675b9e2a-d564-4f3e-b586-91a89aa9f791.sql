
-- Add survey_fields JSONB column to seminars table
-- This stores structured survey form definitions (text, multiple_choice, consent fields)
ALTER TABLE public.seminars ADD COLUMN survey_fields jsonb DEFAULT NULL;

COMMENT ON COLUMN public.seminars.survey_fields IS 'Structured survey form fields: [{id, type, label, required, options?, consentText?, consentLink?}]';
