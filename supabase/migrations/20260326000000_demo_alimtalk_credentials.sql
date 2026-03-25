-- Demo 프로젝트 전용 Ssodaa 크레덴셜 오버라이드
-- !! 이 마이그레이션은 Demo 프로젝트(flestfnjhtvvhyawozvj)에만 적용할 것 !!
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
    'token_key', 'PSsPiE764b70148a36w00A8W77J4334OdqnP137y',
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
    headers := jsonb_build_object('x-api-key', '47471408040767310n60')
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;
