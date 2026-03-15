import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createServiceClient,
  corsHeaders,
  sendNotification,
  sendBatch,
  seminarDetailUrlFor,
  seminarListUrlFor,
  seminarApplicantsUrl,
  mapUrlOrFallback,
  templateForSeminarApplyDone,
  templateForNewSeminarPublished,
  formatKoreanDateTime,
  getRoleFromUserId,
  getSeminarPlace,
  todayKey,
} from "../_shared/notification.ts";
import type { NotificationButton } from "../_shared/notification.ts";

interface RequestBody {
  eventType: "seminar_application" | "seminar_published";
  seminarId: string;
  applicantUserId?: string;
  applicantName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();

    // JWT 확인
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { eventType, seminarId, applicantUserId, applicantName }: RequestBody = await req.json();
    if (!eventType || !seminarId) {
      return new Response(
        JSON.stringify({ error: "eventType and seminarId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 설명회 정보 조회
    const { data: seminar, error: semError } = await supabase
      .from("seminars")
      .select(`
        id,
        title,
        date,
        location,
        target_grade,
        academy_id,
        academies (
          id,
          name,
          owner_id
        )
      `)
      .eq("id", seminarId)
      .single();

    if (semError || !seminar) {
      console.error("Seminar fetch error:", semError);
      return new Response(
        JSON.stringify({ error: "Seminar not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const academy = seminar.academies as unknown as {
      id: string;
      name: string;
      owner_id: string | null;
    };
    const dateKey = todayKey();
    const results: Array<{ templateCode: string; success: boolean }> = [];

    if (eventType === "seminar_application") {
      // ── 설명회 신청 이벤트 ──
      const targetUserId = applicantUserId || user.id;
      const targetName = applicantName || "신청자";
      const seminarAt = formatKoreanDateTime(seminar.date);
      const seminarPlace = getSeminarPlace(seminar.location);
      const appliedAt = formatKoreanDateTime(new Date().toISOString());

      // 1. 신청자에게 신청 완료 알림
      const applicantRole = await getRoleFromUserId(supabase, targetUserId);
      const userRole = applicantRole === "student" ? "student" : "parent";

      const { data: applicantProfile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", targetUserId)
        .maybeSingle();

      if (applicantProfile?.phone) {
        const templateCode = templateForSeminarApplyDone(userRole);
        const detailUrl = seminarDetailUrlFor(userRole, seminarId);
        const buttons: NotificationButton[] = [
          { name: "신청내역 확인", url: detailUrl },
          {
            name: "길찾기",
            url: userRole === "parent"
              ? detailUrl
              : mapUrlOrFallback(seminarPlace, detailUrl),
          },
        ];

        const r1 = await sendNotification(supabase, {
          templateCode,
          recipientPhone: applicantProfile.phone,
          recipientUserId: targetUserId,
          receiverType: "user",
          variables: {
            seminarTitle: seminar.title,
            academyName: academy.name,
            seminarAt,
            seminarPlace,
            applicantName: targetName,
          },
          buttons,
          seminarId,
          academyId: academy.id,
          rateLimitKey: `daily:user:${targetUserId}:${dateKey}`,
        });
        results.push({ templateCode, success: r1.success });
      }

      // 2. 학원 owner에게 신청 접수 알림
      if (academy.owner_id) {
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", academy.owner_id)
          .maybeSingle();

        if (ownerProfile?.phone) {
          const r2 = await sendNotification(supabase, {
            templateCode: "TPL_SEM_APPLIED_ACADEMY_V1",
            recipientPhone: ownerProfile.phone,
            recipientUserId: academy.owner_id,
            receiverType: "academy",
            variables: {
              academyName: academy.name,
              seminarTitle: seminar.title,
              applicantName: targetName,
              appliedAt,
            },
            buttons: [
              { name: "신청자 확인하기", url: seminarApplicantsUrl(seminarId) },
            ],
            seminarId,
            academyId: academy.id,
            rateLimitKey: `daily:academy:${academy.id}:${dateKey}`,
          });
          results.push({
            templateCode: "TPL_SEM_APPLIED_ACADEMY_V1",
            success: r2.success,
          });
        }
      }
    } else if (eventType === "seminar_published") {
      // ── 신규 설명회 등록 이벤트 ──
      const seminarAt = formatKoreanDateTime(seminar.date);

      // 해당 학원과 활성 chat_rooms가 있는 유저들 조회
      const { data: chatRooms, error: crError } = await supabase
        .from("chat_rooms")
        .select("parent_id")
        .eq("academy_id", academy.id);

      if (crError) {
        console.error("Chat rooms fetch error:", crError);
      }

      const uniqueUserIds = [...new Set((chatRooms || []).map((r) => r.parent_id))];
      const targets = uniqueUserIds.slice(0, 100);

      // 10명씩 청크 병렬 발송 — Edge Function 타임아웃(60s) 방지
      await sendBatch(targets, async (targetUserId) => {
        const role = await getRoleFromUserId(supabase, targetUserId);
        const userRole = role === "student" ? "student" : "parent";

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", targetUserId)
          .maybeSingle();

        if (!profile?.phone) return;

        const templateCode = templateForNewSeminarPublished(userRole);

        const r = await sendNotification(supabase, {
          templateCode,
          recipientPhone: profile.phone,
          recipientUserId: targetUserId,
          receiverType: "user",
          variables: {
            seminarTitle: seminar.title,
            academyName: academy.name,
            seminarAt,
            targetGrade: seminar.target_grade || "전체",
          },
          buttons: [
            { name: "설명회 상세보기", url: seminarDetailUrlFor(userRole, seminarId) },
            { name: "전체 설명회 보기", url: seminarListUrlFor(userRole) },
          ],
          seminarId,
          academyId: academy.id,
          rateLimitKey: `daily:user:${targetUserId}:${dateKey}`,
        });
        results.push({ templateCode, success: r.success });
      }, 10);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("notify-seminar-event error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
