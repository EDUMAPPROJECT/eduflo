ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.profiles.image_url IS 'User profile image URL';
