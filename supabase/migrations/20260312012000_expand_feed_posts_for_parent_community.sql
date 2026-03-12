ALTER TABLE public.feed_posts
DROP CONSTRAINT IF EXISTS feed_posts_type_check;

ALTER TABLE public.feed_posts
ADD CONSTRAINT feed_posts_type_check
CHECK (
  type IN (
    'notice',
    'admission',
    'seminar',
    'event',
    'academy-admission',
    'life-parenting',
    'free-talk'
  )
);

CREATE POLICY "Parents can insert their own community feed posts"
ON public.feed_posts
FOR INSERT
TO authenticated
WITH CHECK (
  academy_id IS NULL
  AND author_id = auth.uid()
  AND type IN ('academy-admission', 'life-parenting', 'free-talk')
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'parent'
  )
);

CREATE POLICY "Parents can update their own community feed posts"
ON public.feed_posts
FOR UPDATE
TO authenticated
USING (
  academy_id IS NULL
  AND author_id = auth.uid()
  AND type IN ('academy-admission', 'life-parenting', 'free-talk')
)
WITH CHECK (
  academy_id IS NULL
  AND author_id = auth.uid()
  AND type IN ('academy-admission', 'life-parenting', 'free-talk')
);

CREATE POLICY "Parents can delete their own community feed posts"
ON public.feed_posts
FOR DELETE
TO authenticated
USING (
  academy_id IS NULL
  AND author_id = auth.uid()
  AND type IN ('academy-admission', 'life-parenting', 'free-talk')
);
