-- notification_logs에 pg_net request ID 컬럼 추가
ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS pgnet_request_id bigint;

-- pg_net을 통해 쏘다 알림톡 발송하는 함수
-- Edge Function에서 supabase.rpc('send_alimtalk', params) 로 호출
CREATE OR REPLACE FUNCTION public.send_alimtalk(
  p_template_code text,
  p_dest_phone text,
  p_msg_body text,
  p_buttons jsonb DEFAULT '[]'::jsonb
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_api_key text;
  v_token_key text;
  v_sender_key text;
  v_body jsonb;
  v_request_id bigint;
BEGIN
  -- 비밀값은 DB 설정(app.settings.*)으로 주입한다.
  v_api_key := current_setting('app.settings.ssodaa_api_key', true);
  v_token_key := current_setting('app.settings.ssodaa_token_key', true);
  v_sender_key := current_setting('app.settings.ssodaa_sender_key', true);

  IF v_api_key IS NULL OR v_token_key IS NULL OR v_sender_key IS NULL THEN
    RAISE EXCEPTION 'Missing Ssodaa settings. Configure app.settings.ssodaa_api_key, app.settings.ssodaa_token_key, app.settings.ssodaa_sender_key';
  END IF;

  v_body := jsonb_build_object(
    'token_key', v_token_key,
    'dest_phone', p_dest_phone,
    'sender_key', v_sender_key,
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
    headers := jsonb_build_object('x-api-key', v_api_key)
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- pg_net 응답을 확인하고 notification_logs 상태를 업데이트하는 함수
-- pg_cron으로 30초마다 실행
CREATE OR REPLACE FUNCTION public.process_alimtalk_responses()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_log record;
  v_response record;
  v_content jsonb;
  v_processed int := 0;
  v_success int := 0;
  v_failed int := 0;
BEGIN
  FOR v_log IN
    SELECT id, pgnet_request_id
    FROM public.notification_logs
    WHERE status = 'pending'
      AND pgnet_request_id IS NOT NULL
    ORDER BY sent_at ASC
    LIMIT 100
  LOOP
    SELECT status_code, content::text as content_text
    INTO v_response
    FROM net._http_response
    WHERE id = v_log.pgnet_request_id;

    -- 아직 응답이 없으면 스킵
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_processed := v_processed + 1;

    BEGIN
      v_content := v_response.content_text::jsonb;

      IF v_content->>'code' = '200' THEN
        UPDATE public.notification_logs SET
          status = 'sent',
          api_response = v_content,
          provider_result_code = '200'
        WHERE id = v_log.id;
        v_success := v_success + 1;
      ELSE
        UPDATE public.notification_logs SET
          status = 'failed',
          api_response = v_content,
          error_message = v_content->>'error',
          provider_result_code = v_content->>'code'
        WHERE id = v_log.id;
        v_failed := v_failed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.notification_logs SET
        status = 'failed',
        error_message = 'Response parse error: ' || SQLERRM
      WHERE id = v_log.id;
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'success', v_success,
    'failed', v_failed
  );
END;
$$;
