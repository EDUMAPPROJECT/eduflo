-- 문자콕(MunjaKok) 카카오 알림톡 발송 로그 테이블
CREATE TABLE public.notification_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code     text NOT NULL,
  provider_template_id text,
  recipient_phone   text NOT NULL,
  recipient_user_id uuid,
  receiver_type     text NOT NULL,
  variables         jsonb NOT NULL DEFAULT '{}',
  button_urls       jsonb DEFAULT '[]',
  chat_room_id      uuid REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  seminar_id        uuid REFERENCES public.seminars(id) ON DELETE SET NULL,
  academy_id        uuid REFERENCES public.academies(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'pending',
  api_response      jsonb,
  error_message     text,
  provider_result_code text,
  rate_limit_key    text,
  retry_count       int NOT NULL DEFAULT 0,
  sent_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_logs_sent ON public.notification_logs (sent_at DESC);
CREATE INDEX idx_notif_logs_template ON public.notification_logs (template_code, sent_at DESC);
CREATE INDEX idx_notif_logs_recipient ON public.notification_logs (recipient_user_id, sent_at DESC);
CREATE INDEX idx_notif_logs_rate_limit ON public.notification_logs (rate_limit_key, sent_at DESC)
  WHERE status IN ('sent', 'pending');
CREATE INDEX idx_notif_logs_status ON public.notification_logs (status) WHERE status = 'failed';

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 역할만 접근 가능 (Edge Functions에서 SERVICE_ROLE_KEY 사용)
-- 프론트엔드에서는 직접 접근하지 않으므로 별도 정책 없음
