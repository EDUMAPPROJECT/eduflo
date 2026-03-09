import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Constants ──────────────────────────────────────────────────
const BASE_URL = "https://eduflo.co.kr";
const NAVER_MAP_BASE = "https://map.naver.com/v5/search/";

// ─── Types ──────────────────────────────────────────────────────
export interface NotificationButton {
  name: string;
  url: string;
}

export interface TemplateDefinition {
  code: string;
  messageTemplate: string;
  variableKeys: string[];
  buttonNames: string[];
}

interface SsodaaResponse {
  success: boolean;
  resultCode?: string;
  data?: Record<string, unknown>;
  error?: string;
}

// ─── Template Registry (10개) ───────────────────────────────────
// 메시지 본문은 카카오 검수에 등록된 템플릿과 정확히 일치해야 합니다.
// #{variableName}은 실제 값으로 치환한 후 msg_body 필드에 넣습니다.
// 학부모/학생 별도 템플릿으로 분리 — 카카오 검수 안정성 확보

// 채팅 알림 공통 메시지 (학원 → 학부모/학생)
const CHAT_TO_USER_MSG = [
  "#{academyName}에서 답장이 도착했습니다",
  "",
  "지금 확인하고 이어서 상담해 보세요.",
  "",
  "- 도착시간: #{receivedAt}",
  "",
  "아래 버튼을 누르면 바로 채팅으로 이동합니다.",
].join("\n");

// 설명회 신청완료 공통 메시지
const SEMINAR_APPLY_DONE_MSG = [
  "설명회 신청이 완료되었습니다",
  "",
  "- 설명회: #{seminarTitle}",
  "- 주관: #{academyName}",
  "- 일시: #{seminarAt}",
  "- 장소: #{seminarPlace}",
  "- 신청자: #{applicantName}",
  "",
  "변경/취소 및 상세 안내는 아래에서 확인해 주세요.",
].join("\n");

// 신규 설명회 등록 공통 메시지
const NEW_SEMINAR_PUBLISHED_MSG = [
  "새로운 설명회가 등록되었습니다",
  "",
  "- 설명회: #{seminarTitle}",
  "- 주관: #{academyName}",
  "- 일시: #{seminarAt}",
  "- 대상: #{targetGrade}",
  "",
  "아래에서 상세 확인 후 신청해 주세요.",
].join("\n");

// 설명회 리마인드 공통 메시지
const SEMINAR_REMINDER_MSG = [
  "신청하신 설명회가 내일입니다",
  "",
  "- 설명회: #{seminarTitle}",
  "- 일시: #{seminarAt}",
  "- 장소: #{seminarPlace}",
  "",
  "아래 버튼에서 상세 안내사항을 확인해 주세요.",
].join("\n");

// ── 템플릿 코드 규칙: 5~30자 (영문, 숫자, 하이픈, 언더바) ──
// Old → New (30자 초과 축약)
// TPL_SEMINAR_APPLY_DONE_PARENT_V1 (32자)  → TPL_SEM_DONE_PARENT_V1 (22자)
// TPL_SEMINAR_APPLY_DONE_STUDENT_V1 (33자) → TPL_SEM_DONE_STUDENT_V1 (23자)
// TPL_SEMINAR_APPLY_RECEIVED_ACADEMY_V1 (37자) → TPL_SEM_APPLIED_ACADEMY_V1 (26자)
// TPL_NEW_SEMINAR_PUBLISHED_PARENT_V1 (35자) → TPL_NEW_SEM_PARENT_V1 (21자)
// TPL_NEW_SEMINAR_PUBLISHED_STUDENT_V1 (36자) → TPL_NEW_SEM_STUDENT_V1 (22자)
// TPL_SEMINAR_REMINDER_STUDENT_V1 (31자) → TPL_SEM_REMIND_STUDENT_V1 (25자)

const TEMPLATES: Record<string, TemplateDefinition> = {
  // ── 1. 채팅 도착 알림 (학부모/학생 → 학원) ── 22자
  TPL_CHAT_TO_ACADEMY_V1: {
    code: "TPL_CHAT_TO_ACADEMY_V1",
    messageTemplate: [
      "안녕하세요, #{academyName} 담당자님.",
      "",
      "EDUFLO에서 #{senderName}님이 새 메시지를 보냈습니다.",
      "",
      "- 문의주제: #{inquiryTopic}",
      "- 도착시간: #{receivedAt}",
      "",
      "아래 버튼을 눌러 바로 확인해 주세요.",
    ].join("\n"),
    variableKeys: ["academyName", "senderName", "inquiryTopic", "receivedAt"],
    buttonNames: ["채팅 확인하기"],
  },

  // ── 2. 채팅 도착 알림 (학원 → 학부모) ── 21자
  TPL_CHAT_TO_PARENT_V1: {
    code: "TPL_CHAT_TO_PARENT_V1",
    messageTemplate: CHAT_TO_USER_MSG,
    variableKeys: ["academyName", "receivedAt"],
    buttonNames: ["답장하러 가기"],
  },

  // ── 3. 채팅 도착 알림 (학원 → 학생) ── 22자
  TPL_CHAT_TO_STUDENT_V1: {
    code: "TPL_CHAT_TO_STUDENT_V1",
    messageTemplate: CHAT_TO_USER_MSG,
    variableKeys: ["academyName", "receivedAt"],
    buttonNames: ["답장하러 가기"],
  },

  // ── 4. 설명회 신청 완료 (학부모) ── 22자
  TPL_SEM_DONE_PARENT_V1: {
    code: "TPL_SEM_DONE_PARENT_V1",
    messageTemplate: SEMINAR_APPLY_DONE_MSG,
    variableKeys: ["seminarTitle", "academyName", "seminarAt", "seminarPlace", "applicantName"],
    buttonNames: ["신청내역 확인", "길찾기"],
  },

  // ── 5. 설명회 신청 완료 (학생) ── 23자
  TPL_SEM_DONE_STUDENT_V1: {
    code: "TPL_SEM_DONE_STUDENT_V1",
    messageTemplate: SEMINAR_APPLY_DONE_MSG,
    variableKeys: ["seminarTitle", "academyName", "seminarAt", "seminarPlace", "applicantName"],
    buttonNames: ["신청내역 확인", "길찾기"],
  },

  // ── 6. 설명회 신청 접수 알림 (학원) ── 26자
  TPL_SEM_APPLIED_ACADEMY_V1: {
    code: "TPL_SEM_APPLIED_ACADEMY_V1",
    messageTemplate: [
      "#{academyName} 설명회에 새 신청이 접수되었습니다",
      "",
      "- 설명회: #{seminarTitle}",
      "- 신청자: #{applicantName}",
      "- 신청시간: #{appliedAt}",
      "",
      "아래 버튼에서 신청자 리스트를 확인해 주세요.",
    ].join("\n"),
    variableKeys: ["academyName", "seminarTitle", "applicantName", "appliedAt"],
    buttonNames: ["신청자 확인하기"],
  },

  // ── 7. 신규 설명회 등록 알림 (학부모) ── 21자
  TPL_NEW_SEM_PARENT_V1: {
    code: "TPL_NEW_SEM_PARENT_V1",
    messageTemplate: NEW_SEMINAR_PUBLISHED_MSG,
    variableKeys: ["seminarTitle", "academyName", "seminarAt", "targetGrade"],
    buttonNames: ["설명회 상세보기", "전체 설명회 보기"],
  },

  // ── 8. 신규 설명회 등록 알림 (학생) ── 22자
  TPL_NEW_SEM_STUDENT_V1: {
    code: "TPL_NEW_SEM_STUDENT_V1",
    messageTemplate: NEW_SEMINAR_PUBLISHED_MSG,
    variableKeys: ["seminarTitle", "academyName", "seminarAt", "targetGrade"],
    buttonNames: ["설명회 상세보기", "전체 설명회 보기"],
  },

  // ── 9. 설명회 전일 리마인드 (학부모) ── 25자
  TPL_SEM_REMIND_PARENT_V1: {
    code: "TPL_SEM_REMIND_PARENT_V1",
    messageTemplate: SEMINAR_REMINDER_MSG,
    variableKeys: ["seminarTitle", "seminarAt", "seminarPlace"],
    buttonNames: ["안내사항 확인", "길찾기"],
  },

  // ── 10. 설명회 전일 리마인드 (학생) ── 25자
  TPL_SEM_REMIND_STUDENT_V1: {
    code: "TPL_SEM_REMIND_STUDENT_V1",
    messageTemplate: SEMINAR_REMINDER_MSG,
    variableKeys: ["seminarTitle", "seminarAt", "seminarPlace"],
    buttonNames: ["안내사항 확인", "길찾기"],
  },
};

export function getTemplate(code: string): TemplateDefinition | null {
  return TEMPLATES[code] ?? null;
}

// ─── 역할 분기 헬퍼 ─────────────────────────────────────────────
export function templateForChatToUser(role: "parent" | "student"): string {
  return role === "parent" ? "TPL_CHAT_TO_PARENT_V1" : "TPL_CHAT_TO_STUDENT_V1";
}

export function templateForSeminarApplyDone(role: "parent" | "student"): string {
  return role === "parent"
    ? "TPL_SEM_DONE_PARENT_V1"
    : "TPL_SEM_DONE_STUDENT_V1";
}

export function templateForNewSeminarPublished(role: "parent" | "student"): string {
  return role === "parent"
    ? "TPL_NEW_SEM_PARENT_V1"
    : "TPL_NEW_SEM_STUDENT_V1";
}

export function templateForSeminarReminder(role: "parent" | "student"): string {
  return role === "parent"
    ? "TPL_SEM_REMIND_PARENT_V1"
    : "TPL_SEM_REMIND_STUDENT_V1";
}

// ─── URL Builder ────────────────────────────────────────────────
export function chatUrlFor(
  role: "academy" | "parent" | "student",
  chatRoomId: string
): string {
  const prefix = role === "academy" ? "/admin" : role === "parent" ? "/p" : "/s";
  return `${BASE_URL}${prefix}/chats/${chatRoomId}`;
}

export function seminarDetailUrlFor(
  role: "parent" | "student",
  seminarId: string
): string {
  const prefix = role === "parent" ? "/p" : "/s";
  return `${BASE_URL}${prefix}/seminar/${seminarId}`;
}

export function seminarListUrlFor(role: "parent" | "student"): string {
  const prefix = role === "parent" ? "/p" : "/s";
  return `${BASE_URL}${prefix}/explore?tab=seminars`;
}

export function seminarApplicantsUrl(seminarId: string): string {
  return `${BASE_URL}/admin/seminars/${seminarId}/applicants`;
}

export function buildMapUrl(place: string | null): string | null {
  if (!place) return null;
  return `${NAVER_MAP_BASE}${encodeURIComponent(place)}`;
}

// 길찾기 버튼 URL — 카카오 템플릿은 버튼 개수가 고정이므로 항상 URL을 반환.
// 장소가 없으면 설명회 상세 페이지로 fallback.
export function mapUrlOrFallback(
  place: string | null,
  fallbackUrl: string
): string {
  if (place && place !== "장소 미정") {
    return `${NAVER_MAP_BASE}${encodeURIComponent(place)}`;
  }
  return fallbackUrl;
}

// ─── 메시지 빌더 ────────────────────────────────────────────────
// 템플릿의 #{variableName} 플레이스홀더를 실제 값으로 치환
export function buildMessage(
  template: TemplateDefinition,
  variables: Record<string, string>
): string {
  let msg = template.messageTemplate;
  for (const key of template.variableKeys) {
    msg = msg.replaceAll(`#{${key}}`, variables[key] || "");
  }
  return msg;
}

// ─── Rate Limiter (DB-based) ────────────────────────────────────
export async function checkRateLimit(
  supabase: SupabaseClient,
  rateLimitKey: string,
  windowMinutes: number,
  maxCount: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("notification_logs")
    .select("*", { count: "exact", head: true })
    .eq("rate_limit_key", rateLimitKey)
    .in("status", ["sent", "pending"])
    .gte("sent_at", windowStart);

  if (error) {
    console.error("Rate limit check error:", error);
    return false; // 에러 시 발송 허용
  }

  return (count ?? 0) < maxCount;
}

// ─── Ssodaa (쏘다) API Adapter ──────────────────────────────────
// API Docs: https://apis.ssodaa.com
// 알림톡 발송: POST /kakao/send/alimtalk
// 필수 헤더: x-api-key, Content-Type: application/json; charset=utf-8
const SSODAA_BASE_URL = "https://apis.ssodaa.com";

export async function callSsodaaApi(params: {
  templateCode: string;
  phone: string;
  message: string;
  buttons: NotificationButton[];
}): Promise<SsodaaResponse> {
  const dryRun = Deno.env.get("SSODAA_DRY_RUN") === "true";

  if (dryRun) {
    console.log("[DRY_RUN] Ssodaa API call skipped:", {
      templateCode: params.templateCode,
      phone: params.phone,
      messagePreview: params.message.slice(0, 80) + "...",
      buttons: params.buttons,
    });
    return { success: true, resultCode: "DRY_RUN" };
  }

  const apiKey = Deno.env.get("SSODAA_API_KEY");
  const tokenKey = Deno.env.get("SSODAA_TOKEN_KEY");
  const senderKey = Deno.env.get("SSODAA_SENDER_KEY");

  if (!apiKey || !tokenKey || !senderKey) {
    return { success: false, error: "Missing Ssodaa API configuration (SSODAA_API_KEY, SSODAA_TOKEN_KEY, SSODAA_SENDER_KEY)" };
  }

  try {
    const body: Record<string, unknown> = {
      token_key: tokenKey,
      dest_phone: params.phone,
      sender_key: senderKey,
      template_code: params.templateCode,
      msg_body: params.message,
      failover: {
        use: "Y",
        msg_body: params.message,
      },
    };

    // 버튼이 있는 경우 button 배열 추가
    if (params.buttons.length > 0) {
      body.button = params.buttons.map((b) => ({
        name: b.name,
        type: "WL",
        url_mobile: b.url,
        url_pc: b.url,
      }));
    }

    const response = await fetch(`${SSODAA_BASE_URL}/kakao/send/alimtalk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.code !== "200") {
      return {
        success: false,
        resultCode: data.code || String(response.status),
        data,
        error: data.error || "Ssodaa API request failed",
      };
    }

    return {
      success: true,
      resultCode: data.code || "200",
      data,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// ─── Helpers ────────────────────────────────────────────────────
export function normalizePhone(phone: string): string {
  // 한국 전화번호 → 숫자만 (알림톡 API는 01012345678 형식)
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("82") && digits.length >= 12) {
    return "0" + digits.slice(2);
  }
  return digits || phone;
}

export function formatKoreanDateTime(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export async function getRoleFromUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<"parent" | "student" | "admin"> {
  // 두 쿼리를 병렬 실행하여 지연 최소화
  const [roleResult, studentResult] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    supabase.from("student_profiles").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  if (roleResult.data?.role === "admin") return "admin";
  if (studentResult.data) return "student";
  return "parent";
}

export function parseSeminarLocation(location: string | null): {
  name: string;
  address: string;
} {
  if (!location) return { name: "", address: "" };
  try {
    const parsed = JSON.parse(location);
    return {
      name: parsed.name || "",
      address: parsed.address || "",
    };
  } catch {
    return { name: location, address: "" };
  }
}

export function getSeminarPlace(location: string | null): string {
  const { name, address } = parseSeminarLocation(location);
  return name || address || "장소 미정";
}

// ─── 재시도 불가 에러 판별 ──────────────────────────────────────
const NON_RETRYABLE_CODES = new Set([
  "INVALID_PHONE",
  "BLOCKED",
  "UNSUBSCRIBED",
  "OPTED_OUT",
]);

export function isRetryable(resultCode: string | null): boolean {
  if (!resultCode) return true;
  return !NON_RETRYABLE_CODES.has(resultCode);
}

// ─── Main Orchestrator ──────────────────────────────────────────
export interface SendNotificationParams {
  templateCode: string;
  recipientPhone: string;
  recipientUserId?: string;
  receiverType: string;
  variables: Record<string, string>;
  buttons: NotificationButton[];
  chatRoomId?: string;
  seminarId?: string;
  academyId?: string;
  rateLimitKey?: string;
}

export async function sendNotification(
  supabase: SupabaseClient,
  params: SendNotificationParams
): Promise<{ success: boolean; logId?: string; skipped?: boolean; error?: string }> {
  const template = getTemplate(params.templateCode);
  if (!template) {
    return { success: false, error: `Unknown template: ${params.templateCode}` };
  }

  const phone = normalizePhone(params.recipientPhone);

  // Rate limit 확인
  if (params.rateLimitKey) {
    if (params.rateLimitKey.startsWith("chat:")) {
      const allowed = await checkRateLimit(supabase, params.rateLimitKey, 1, 1);
      if (!allowed) {
        return logSkipped(supabase, params, template, phone, "Rate limit exceeded (chat cooldown)");
      }
    }
    if (params.rateLimitKey.startsWith("daily:user:")) {
      const allowed = await checkRateLimit(supabase, params.rateLimitKey, 1440, 20);
      if (!allowed) {
        return logSkipped(supabase, params, template, phone, "Daily user rate limit exceeded");
      }
    }
    if (params.rateLimitKey.startsWith("daily:academy:")) {
      const allowed = await checkRateLimit(supabase, params.rateLimitKey, 1440, 50);
      if (!allowed) {
        return logSkipped(supabase, params, template, phone, "Daily academy rate limit exceeded");
      }
    }
  }

  // 메시지 본문 빌드 (#{variableName} → 실제 값)
  const message = buildMessage(template, params.variables);

  // API 호출
  const apiResult = await callSsodaaApi({
    templateCode: template.code,
    phone,
    message,
    buttons: params.buttons,
  });

  // 로그 기록
  const { data: logData } = await supabase
    .from("notification_logs")
    .insert({
      template_code: params.templateCode,
      provider_template_id: template.code,
      recipient_phone: phone,
      recipient_user_id: params.recipientUserId || null,
      receiver_type: params.receiverType,
      variables: params.variables,
      button_urls: params.buttons,
      chat_room_id: params.chatRoomId || null,
      seminar_id: params.seminarId || null,
      academy_id: params.academyId || null,
      status: apiResult.success ? "sent" : "failed",
      api_response: apiResult.data || null,
      error_message: apiResult.error || null,
      provider_result_code: apiResult.resultCode || null,
      rate_limit_key: params.rateLimitKey || null,
    })
    .select("id")
    .single();

  return {
    success: apiResult.success,
    logId: logData?.id,
    error: apiResult.error,
  };
}

// skipped 로그 기록 헬퍼
async function logSkipped(
  supabase: SupabaseClient,
  params: SendNotificationParams,
  template: TemplateDefinition,
  phone: string,
  reason: string
): Promise<{ success: boolean; logId?: string; skipped: boolean }> {
  const { data } = await supabase
    .from("notification_logs")
    .insert({
      template_code: params.templateCode,
      provider_template_id: template.code,
      recipient_phone: phone,
      recipient_user_id: params.recipientUserId || null,
      receiver_type: params.receiverType,
      variables: params.variables,
      button_urls: params.buttons,
      chat_room_id: params.chatRoomId || null,
      seminar_id: params.seminarId || null,
      academy_id: params.academyId || null,
      status: "skipped",
      error_message: reason,
      rate_limit_key: params.rateLimitKey || null,
    })
    .select("id")
    .single();
  return { success: true, skipped: true, logId: data?.id };
}

// ─── Supabase 클라이언트 생성 헬퍼 ──────────────────────────────
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── CORS 헤더 ──────────────────────────────────────────────────
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── 배치 처리 헬퍼 ─────────────────────────────────────────────
// Edge Function 타임아웃 방지를 위해 청크 단위 병렬 발송
export async function sendBatch<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  chunkSize = 10
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.allSettled(chunk.map(fn));
  }
}

// ─── 날짜 키 헬퍼 ──────────────────────────────────────────────
export function todayKey(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, "");
}
