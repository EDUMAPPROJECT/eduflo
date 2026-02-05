-- Add author_id column to feed_posts to track who created the post (for super admin posts without academy)
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);

-- Add author_id column to seminars to track who created the seminar
ALTER TABLE public.seminars ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);

-- Update RLS policy for feed_posts to allow super admins to create posts without academy
DROP POLICY IF EXISTS "Super admins can manage all feed posts" ON public.feed_posts;
CREATE POLICY "Super admins can manage all feed posts"
ON public.feed_posts
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Update RLS policy for seminars to allow super admins to create seminars without academy
DROP POLICY IF EXISTS "Super admins can manage all seminars" ON public.seminars;
CREATE POLICY "Super admins can manage all seminars"
ON public.seminars
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));