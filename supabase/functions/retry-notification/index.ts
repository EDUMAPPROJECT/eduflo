import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createServiceClient,
  corsHeaders,
  getTemplate,
  buildMessage,
  callMunjaKokApi,
  normalizePhone,
  isRetryable,
} from "../_shared/notification.ts";
import type { NotificationButton } from "../_shared/notification.ts";

/**
 * retry-notification
 *
 * 실패한 알림 재시도 (retry_count < 2)
 * 트리거: pg_cron 2분마다 또는 수동 호출
 * 인증: Authorization: Bearer {SERVICE_ROLE_KEY}
 *
 * 재시도 정책:
 *  - 1차: 실패 후 1분 (sent_at + 1분 < now)
 *  - 2차: 실패 후 5분 (sent_at + 5분 < now)
 *  - 수신거부/번호오류: 재시도 제외
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Service role key required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createServiceClient();
    const now = new Date();

    // status='failed' AND retry_count < 2 조회
    const { data: failedLogs, error: fetchError } = await supabase
      .from("notification_logs")
      .select("*")
      .eq("status", "failed")
      .lt("retry_count", 2)
      .order("sent_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Failed to fetch retry candidates:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch retry candidates" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!failedLogs || failedLogs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No retries needed", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let retried = 0;
    let skipped = 0;

    for (const log of failedLogs) {
      // 수신거부/번호오류 제외
      if (!isRetryable(log.provider_result_code)) {
        skipped++;
        continue;
      }

      // 재시도 간격 확인
      const sentAt = new Date(log.sent_at);
      const waitMinutes = log.retry_count === 0 ? 1 : 5;
      const retryAfter = new Date(sentAt.getTime() + waitMinutes * 60 * 1000);

      if (now < retryAfter) continue;

      const template = getTemplate(log.template_code);
      if (!template) {
        skipped++;
        continue;
      }

      // 메시지 본문 재빌드
      const message = buildMessage(template, log.variables || {});
      const phone = normalizePhone(log.recipient_phone);

      // 버튼 복원: button_urls에 NotificationButton[] 형태로 저장되어 있음
      const storedButtons: NotificationButton[] = Array.isArray(log.button_urls)
        ? log.button_urls.map((b: unknown) => {
            if (typeof b === "object" && b !== null && "name" in b && "url" in b) {
              return b as NotificationButton;
            }
            // 이전 형식 (string[]) fallback
            if (typeof b === "string") {
              return { name: "바로가기", url: b };
            }
            return { name: "바로가기", url: "" };
          })
        : [];

      const apiResult = await callMunjaKokApi({
        templateCode: template.code,
        phone,
        message,
        buttons: storedButtons,
      });

      // 업데이트
      await supabase
        .from("notification_logs")
        .update({
          status: apiResult.success ? "sent" : "failed",
          api_response: apiResult.data || null,
          error_message: apiResult.error || null,
          provider_result_code: apiResult.resultCode || null,
          retry_count: log.retry_count + 1,
          sent_at: new Date().toISOString(),
        })
        .eq("id", log.id);

      retried++;
    }

    return new Response(
      JSON.stringify({ success: true, retried, skipped, total: failedLogs.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("retry-notification error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
