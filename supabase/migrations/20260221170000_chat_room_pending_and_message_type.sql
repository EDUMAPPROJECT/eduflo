-- 강사에게 채팅 상담 요청 시 수락 전까지 대기하는 구조 지원

-- 1. chat_rooms: status 추가 (pending = 강사 수락 대기, active = 채팅 가능)
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

COMMENT ON COLUMN public.chat_rooms.status IS 'pending: 강사 수락 대기, active: 채팅 진행 중';

-- 2. messages: message_type 추가 (user = 일반 메시지, chat_request = 채팅 상담 요청 시스템 메시지)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'user';

COMMENT ON COLUMN public.messages.message_type IS 'user: 일반 메시지, chat_request: 채팅 상담 요청(강사 수락 대기)';

-- 강사 수락 시 학부모 화면 반영을 위해 chat_rooms 실시간 구독
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
