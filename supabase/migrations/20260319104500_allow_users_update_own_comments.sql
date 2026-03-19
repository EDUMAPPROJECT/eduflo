-- 댓글 수정 허용 정책 추가
-- 기존에는 INSERT/DELETE만 있고 UPDATE 정책이 없어 수정이 DB에 반영되지 않았습니다.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'post_comments'
      AND policyname = 'Users can update their own comments'
  ) THEN
    CREATE POLICY "Users can update their own comments"
    ON public.post_comments
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;