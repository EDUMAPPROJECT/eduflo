
-- 1. academy_members 테이블 생성 (학원 멤버십 관리)
CREATE TABLE public.academy_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  permissions JSONB NOT NULL DEFAULT '{
    "manage_classes": true,
    "manage_teachers": true,
    "manage_posts": true,
    "manage_seminars": true,
    "manage_consultations": true,
    "view_analytics": true,
    "manage_settings": false,
    "manage_members": false
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(academy_id, user_id)
);

-- 2. academies 테이블에 join_code 컬럼 추가
ALTER TABLE public.academies 
ADD COLUMN join_code TEXT UNIQUE,
ADD COLUMN join_code_created_at TIMESTAMP WITH TIME ZONE;

-- 3. academy_members에 RLS 활성화
ALTER TABLE public.academy_members ENABLE ROW LEVEL SECURITY;

-- 4. 참여 코드 생성 함수
CREATE OR REPLACE FUNCTION public.generate_academy_join_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- 6자리 영숫자 코드 생성
    new_code := upper(substr(md5(random()::text), 1, 6));
    
    -- 중복 확인
    SELECT EXISTS(SELECT 1 FROM academies WHERE join_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- 5. 학원 권한 확인 함수
CREATE OR REPLACE FUNCTION public.has_academy_permission(_user_id UUID, _academy_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_members
    WHERE user_id = _user_id
      AND academy_id = _academy_id
      AND (
        role = 'owner' 
        OR (permissions->>_permission)::boolean = true
      )
  )
$$;

-- 6. 학원 소유자 확인 함수
CREATE OR REPLACE FUNCTION public.is_academy_owner(_user_id UUID, _academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_members
    WHERE user_id = _user_id
      AND academy_id = _academy_id
      AND role = 'owner'
  )
$$;

-- 7. 학원 멤버 확인 함수
CREATE OR REPLACE FUNCTION public.is_academy_member(_user_id UUID, _academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_members
    WHERE user_id = _user_id
      AND academy_id = _academy_id
  )
$$;

-- 8. academy_members RLS 정책
CREATE POLICY "Academy members can view their academy members"
ON public.academy_members
FOR SELECT
USING (is_academy_member(auth.uid(), academy_id));

CREATE POLICY "Academy owners can insert members"
ON public.academy_members
FOR INSERT
WITH CHECK (
  is_academy_owner(auth.uid(), academy_id)
  OR 
  -- 참여 코드로 본인을 추가하는 경우
  (auth.uid() = user_id AND role = 'admin')
);

CREATE POLICY "Academy owners can update members"
ON public.academy_members
FOR UPDATE
USING (is_academy_owner(auth.uid(), academy_id) AND role != 'owner');

CREATE POLICY "Academy owners can delete members"
ON public.academy_members
FOR DELETE
USING (is_academy_owner(auth.uid(), academy_id) AND role != 'owner');

CREATE POLICY "Super admins can manage all academy members"
ON public.academy_members
FOR ALL
USING (is_super_admin(auth.uid()));

-- 9. 기존 academies 데이터를 academy_members로 마이그레이션
INSERT INTO public.academy_members (academy_id, user_id, role, permissions)
SELECT 
  id as academy_id,
  owner_id as user_id,
  'owner' as role,
  '{
    "manage_classes": true,
    "manage_teachers": true,
    "manage_posts": true,
    "manage_seminars": true,
    "manage_consultations": true,
    "view_analytics": true,
    "manage_settings": true,
    "manage_members": true
  }'::jsonb as permissions
FROM public.academies
WHERE owner_id IS NOT NULL
ON CONFLICT (academy_id, user_id) DO NOTHING;

-- 10. classes 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can insert classes" ON public.classes;
DROP POLICY IF EXISTS "Academy owners can update their classes" ON public.classes;
DROP POLICY IF EXISTS "Academy owners can delete their classes" ON public.classes;

CREATE POLICY "Academy members can insert classes"
ON public.classes
FOR INSERT
WITH CHECK (has_academy_permission(auth.uid(), academy_id, 'manage_classes'));

CREATE POLICY "Academy members can update classes"
ON public.classes
FOR UPDATE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_classes'));

CREATE POLICY "Academy members can delete classes"
ON public.classes
FOR DELETE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_classes'));

-- 11. teachers 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Academy owners can update their teachers" ON public.teachers;
DROP POLICY IF EXISTS "Academy owners can delete their teachers" ON public.teachers;

CREATE POLICY "Academy members can insert teachers"
ON public.teachers
FOR INSERT
WITH CHECK (has_academy_permission(auth.uid(), academy_id, 'manage_teachers'));

CREATE POLICY "Academy members can update teachers"
ON public.teachers
FOR UPDATE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_teachers'));

CREATE POLICY "Academy members can delete teachers"
ON public.teachers
FOR DELETE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_teachers'));

-- 12. posts 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Academy owners can update their posts" ON public.posts;
DROP POLICY IF EXISTS "Academy owners can delete their posts" ON public.posts;

CREATE POLICY "Academy members can insert posts"
ON public.posts
FOR INSERT
WITH CHECK (has_academy_permission(auth.uid(), academy_id, 'manage_posts'));

CREATE POLICY "Academy members can update posts"
ON public.posts
FOR UPDATE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_posts'));

CREATE POLICY "Academy members can delete posts"
ON public.posts
FOR DELETE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_posts'));

-- 13. seminars 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can insert seminars" ON public.seminars;
DROP POLICY IF EXISTS "Academy owners can update their seminars" ON public.seminars;
DROP POLICY IF EXISTS "Academy owners can delete their seminars" ON public.seminars;

CREATE POLICY "Academy members can insert seminars"
ON public.seminars
FOR INSERT
WITH CHECK (has_academy_permission(auth.uid(), academy_id, 'manage_seminars'));

CREATE POLICY "Academy members can update seminars"
ON public.seminars
FOR UPDATE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_seminars'));

CREATE POLICY "Academy members can delete seminars"
ON public.seminars
FOR DELETE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_seminars'));

-- 14. feed_posts 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can insert feed posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Academy owners can update their feed posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Academy owners can delete their feed posts" ON public.feed_posts;

CREATE POLICY "Academy members can insert feed posts"
ON public.feed_posts
FOR INSERT
WITH CHECK (has_academy_permission(auth.uid(), academy_id, 'manage_posts'));

CREATE POLICY "Academy members can update feed posts"
ON public.feed_posts
FOR UPDATE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_posts'));

CREATE POLICY "Academy members can delete feed posts"
ON public.feed_posts
FOR DELETE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_posts'));

-- 15. consultations 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can view consultations for their academies" ON public.consultations;
DROP POLICY IF EXISTS "Academy owners can update consultation status" ON public.consultations;

CREATE POLICY "Academy members can view consultations"
ON public.consultations
FOR SELECT
USING (has_academy_permission(auth.uid(), academy_id, 'manage_consultations'));

CREATE POLICY "Academy members can update consultations"
ON public.consultations
FOR UPDATE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_consultations'));

-- 16. consultation_reservations 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can view reservations for their academies" ON public.consultation_reservations;
DROP POLICY IF EXISTS "Academy owners can update reservation status" ON public.consultation_reservations;

CREATE POLICY "Academy members can view reservations"
ON public.consultation_reservations
FOR SELECT
USING (has_academy_permission(auth.uid(), academy_id, 'manage_consultations'));

CREATE POLICY "Academy members can update reservations"
ON public.consultation_reservations
FOR UPDATE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_consultations'));

-- 17. academy_settings 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can insert their settings" ON public.academy_settings;
DROP POLICY IF EXISTS "Academy owners can update their settings" ON public.academy_settings;

CREATE POLICY "Academy members can insert settings"
ON public.academy_settings
FOR INSERT
WITH CHECK (has_academy_permission(auth.uid(), academy_id, 'manage_settings'));

CREATE POLICY "Academy members can update settings"
ON public.academy_settings
FOR UPDATE
USING (has_academy_permission(auth.uid(), academy_id, 'manage_settings'));

-- 18. chat_rooms 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can view chat rooms for their academies" ON public.chat_rooms;

CREATE POLICY "Academy members can view chat rooms"
ON public.chat_rooms
FOR SELECT
USING (is_academy_member(auth.uid(), academy_id));

-- 19. messages 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Chat participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Chat participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;

CREATE POLICY "Chat participants can view messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE chat_rooms.id = messages.chat_room_id
    AND (
      chat_rooms.parent_id = auth.uid()
      OR is_academy_member(auth.uid(), chat_rooms.academy_id)
    )
  )
);

CREATE POLICY "Chat participants can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE chat_rooms.id = messages.chat_room_id
    AND (
      chat_rooms.parent_id = auth.uid()
      OR is_academy_member(auth.uid(), chat_rooms.academy_id)
    )
  )
);

CREATE POLICY "Chat participants can mark messages as read"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE chat_rooms.id = messages.chat_room_id
    AND (
      chat_rooms.parent_id = auth.uid()
      OR is_academy_member(auth.uid(), chat_rooms.academy_id)
    )
  )
);

-- 20. profile_views 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can view their profile views" ON public.profile_views;

CREATE POLICY "Academy members can view profile views"
ON public.profile_views
FOR SELECT
USING (has_academy_permission(auth.uid(), academy_id, 'view_analytics'));

-- 21. seminar_applications 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Academy owners can view applications for their seminars" ON public.seminar_applications;

CREATE POLICY "Academy members can view seminar applications"
ON public.seminar_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM seminars s
    WHERE s.id = seminar_applications.seminar_id
    AND has_academy_permission(auth.uid(), s.academy_id, 'manage_seminars')
  )
);

-- 22. updated_at 트리거 추가
CREATE TRIGGER update_academy_members_updated_at
BEFORE UPDATE ON public.academy_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
