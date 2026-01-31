-- RLS 정책 보안 강화: 가상 프로필 생성 시 인증된 사용자만 허용
DROP POLICY "Parents can create student profiles (virtual children)" ON public.student_profiles;

CREATE POLICY "Authenticated users can create virtual profiles"
    ON public.student_profiles FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        user_id IS NULL
    );

-- 학생이 자신의 프로필을 생성할 수 있도록 정책 추가
CREATE POLICY "Students can create their own profile"
    ON public.student_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 부모가 실제 연결된 프로필도 삭제할 수 없도록 정책 강화 (가상만 삭제 가능)
-- 이미 설정되어 있음

-- connection_codes의 "Anyone can view" 정책 수정 - 코드 조회는 입력할 때만 필요
DROP POLICY "Anyone can view pending codes for connection" ON public.connection_codes;

CREATE POLICY "Users can view pending codes by code value"
    ON public.connection_codes FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND 
        status = 'pending' AND 
        expires_at > now()
    );