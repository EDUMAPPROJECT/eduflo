-- Allow academy members to comment on their academy posts

-- Replace the old policy that only allowed parents/students
DROP POLICY IF EXISTS "Parents and students can insert comments" ON public.post_comments;

CREATE POLICY "Parents, students, and academy members can insert comments"
ON public.post_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- parent/student can comment anywhere
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('parent', 'student')
    )
    OR
    -- academy members can comment on posts of their own academy
    EXISTS (
      SELECT 1
      FROM public.feed_posts fp
      JOIN public.academy_members am
        ON am.academy_id = fp.academy_id
       AND am.user_id = auth.uid()
       AND am.status = 'approved'
      WHERE fp.id = post_id
        AND fp.academy_id IS NOT NULL
    )
  )
);