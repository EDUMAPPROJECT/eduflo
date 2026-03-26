-- Prod 프로젝트 전용 Ssodaa 알림톡 credentials 복구
-- 20260326000000 (demo 전용)이 잘못 적용된 것을 되돌립니다.
-- Prod 프로젝트(bepowidpygecugwxevhn) 전용 — 발송서버 IP: 3.108.182.46
CREATE OR REPLACE FUNCTION public.send_alimtalk(
  p_template_code text,
  p_dest_phone text,
  p_msg_body text,
  p_buttons jsonb DEFAULT '[]'::jsonb
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_body jsonb;
  v_request_id bigint;
BEGIN
  v_body := jsonb_build_object(
    'token_key', 'gSM30q84w0O1e0P70K3w7GG7kF9q15P6A250pc0f',
    'dest_phone', p_dest_phone,
    'sender_key', 'e94498449c04571b56f2e25dd82fb66dec672d62',
    'template_code', p_template_code,
    'msg_body', p_msg_body,
    'failover', jsonb_build_object('use', 'Y', 'msg_body', p_msg_body)
  );

  IF jsonb_array_length(p_buttons) > 0 THEN
    v_body := v_body || jsonb_build_object('button', p_buttons);
  END IF;

  SELECT net.http_post(
    url := 'https://apis.ssodaa.com/kakao/send/alimtalk'::text,
    body := v_body,
    params := '{}'::jsonb,
    headers := jsonb_build_object('x-api-key', '40771159375430028007')
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;
