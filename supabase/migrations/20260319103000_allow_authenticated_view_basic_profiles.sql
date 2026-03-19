-- 댓글/차단목록 등에서 닉네임 노출을 위해
-- 인증 사용자에게 profiles 조회를 허용합니다.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Authenticated users can view basic profiles'
  ) THEN
    CREATE POLICY "Authenticated users can view basic profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;