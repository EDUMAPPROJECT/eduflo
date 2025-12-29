-- Add learning_style column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN learning_style text;

-- Add a comment to describe the column
COMMENT ON COLUMN public.profiles.learning_style IS 'User learning style type: self_directed, interactive, structured, mentored';