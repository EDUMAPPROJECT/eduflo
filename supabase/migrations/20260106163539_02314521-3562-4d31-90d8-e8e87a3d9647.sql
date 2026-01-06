-- Add lock fields to academies table for super admin control
ALTER TABLE public.academies 
ADD COLUMN is_profile_locked boolean DEFAULT false,
ADD COLUMN locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN locked_at timestamp with time zone;

-- Create index for locked academies lookup
CREATE INDEX idx_academies_is_profile_locked ON public.academies(is_profile_locked) WHERE is_profile_locked = true;

-- Add comment for documentation
COMMENT ON COLUMN public.academies.is_profile_locked IS 'When true, only super admin can modify target_regions and target_tags';
COMMENT ON COLUMN public.academies.locked_by IS 'Super admin who locked this profile';
COMMENT ON COLUMN public.academies.locked_at IS 'When the profile was locked';