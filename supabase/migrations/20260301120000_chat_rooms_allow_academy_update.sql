-- 강사가 채팅 상담 수락 시 chat_rooms.status를 pending -> active 로 업데이트할 수 있도록 RLS 정책 추가
-- (기존에 UPDATE 정책이 없어 수락해도 DB에 반영되지 않던 문제 해결)

CREATE POLICY "Academy members can update chat rooms"
ON public.chat_rooms
FOR UPDATE
USING (is_academy_member(auth.uid(), academy_id))
WITH CHECK (is_academy_member(auth.uid(), academy_id));
