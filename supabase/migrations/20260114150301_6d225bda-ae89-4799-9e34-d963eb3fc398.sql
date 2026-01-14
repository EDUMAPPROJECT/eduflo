-- Add status column to academy_members for approval workflow
ALTER TABLE public.academy_members 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

-- Add edit_profile permission to existing permissions default
-- Update default permissions to include edit_profile
ALTER TABLE public.academy_members 
ALTER COLUMN permissions SET DEFAULT '{"manage_posts": true, "manage_classes": true, "manage_members": false, "view_analytics": true, "manage_seminars": true, "manage_settings": false, "manage_teachers": true, "manage_consultations": true, "edit_profile": false}'::jsonb;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_academy_members_status ON public.academy_members(status);

-- Update existing approved members to have the new permission key (set to false by default)
UPDATE public.academy_members 
SET permissions = permissions || '{"edit_profile": false}'::jsonb
WHERE NOT (permissions ? 'edit_profile');

-- Update RLS policies to only allow approved members
DROP POLICY IF EXISTS "Academy members can view their academy members" ON public.academy_members;
CREATE POLICY "Academy members can view their academy members" 
ON public.academy_members 
FOR SELECT 
USING (
  is_academy_member(auth.uid(), academy_id) OR 
  (auth.uid() = user_id)
);

-- Update the is_academy_member function to only return true for approved members
CREATE OR REPLACE FUNCTION public.is_academy_member(_user_id uuid, _academy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_members
    WHERE user_id = _user_id
      AND academy_id = _academy_id
      AND status = 'approved'
  )
$$;

-- Update has_academy_permission to check for approved status
CREATE OR REPLACE FUNCTION public.has_academy_permission(_user_id uuid, _academy_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_members
    WHERE user_id = _user_id
      AND academy_id = _academy_id
      AND status = 'approved'
      AND (
        role = 'owner' 
        OR (permissions->>_permission)::boolean = true
      )
  )
$$;