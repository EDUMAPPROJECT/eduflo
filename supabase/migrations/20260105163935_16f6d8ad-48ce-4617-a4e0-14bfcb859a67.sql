-- Add profile_tags column to profiles table for storing parent test results
ALTER TABLE public.profiles
ADD COLUMN profile_tags text[] DEFAULT '{}'::text[];

-- Add target_tags column to academies table for recommendation matching
ALTER TABLE public.academies
ADD COLUMN target_tags text[] DEFAULT '{}'::text[];

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.profile_tags IS 'Tag keys from parent preference test (e.g., grade:mid_1_2, subject:math)';
COMMENT ON COLUMN public.academies.target_tags IS 'Target student tag keys for recommendation matching';