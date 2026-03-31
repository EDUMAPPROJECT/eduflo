-- Ensure legacy academy owners (academies.owner_id) have post permissions
-- even when academy_members rows are missing.
CREATE OR REPLACE FUNCTION public.has_academy_permission(_user_id uuid, _academy_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_members am
    WHERE am.user_id = _user_id
      AND am.academy_id = _academy_id
      AND am.status = 'approved'
      AND (
        am.role = 'owner'
        OR (am.permissions->>_permission)::boolean = true
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.academies a
    WHERE a.id = _academy_id
      AND a.owner_id = _user_id
  );
$$;

-- Recreate comment insert policy to include legacy owner_id fallback.
DROP POLICY IF EXISTS "Parents, students, and academy members can insert comments" ON public.post_comments;
DROP POLICY IF EXISTS "Parents and students can insert comments" ON public.post_comments;

CREATE POLICY "Parents, students, academy members, and legacy owners can insert comments"
ON public.post_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('parent', 'student')
    )
    OR EXISTS (
      SELECT 1
      FROM public.feed_posts fp
      WHERE fp.id = post_id
        AND fp.academy_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.academy_members am
            WHERE am.academy_id = fp.academy_id
              AND am.user_id = auth.uid()
              AND am.status = 'approved'
          )
          OR EXISTS (
            SELECT 1
            FROM public.academies a
            WHERE a.id = fp.academy_id
              AND a.owner_id = auth.uid()
          )
        )
    )
  )
);
