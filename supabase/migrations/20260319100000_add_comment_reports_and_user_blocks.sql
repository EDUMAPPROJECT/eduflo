-- 댓글 신고 및 사용자 차단 기능

CREATE TABLE IF NOT EXISTS public.comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  reason_type TEXT NOT NULL,
  reason_detail TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own comment reports"
ON public.comment_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own comment reports"
ON public.comment_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON public.comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter_id ON public.comment_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON public.comment_reports(created_at DESC);


CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_no_self_block CHECK (blocker_id <> blocked_user_id),
  CONSTRAINT user_blocks_unique_pair UNIQUE (blocker_id, blocked_user_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own blocks"
ON public.user_blocks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view their own blocks"
ON public.user_blocks
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
ON public.user_blocks
FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_user_id ON public.user_blocks(blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_created_at ON public.user_blocks(created_at DESC);
