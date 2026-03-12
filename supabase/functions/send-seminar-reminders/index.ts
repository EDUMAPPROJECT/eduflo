import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createServiceClient,
  corsHeaders,
  sendNotification,
  seminarDetailUrlFor,
  mapUrlOrFallback,
  templateForSeminarReminder,
  formatKoreanDateTime,
  getRoleFromUserId,
  getSeminarPlace,
  todayKey,
} from "../_shared/notification.ts";
import type { NotificationButton } from "../_shared/notification.ts";

/**
 * send-seminar-reminders
 *
 * 트리거: pg_cron 매일 10:00 KST (01:00 UTC)
 * 인증: Authorization: Bearer {SERVICE_ROLE_KEY}
 *
 * 내일 예정된 설명회의 신청자들에게 리마인드 알림 발송
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SERVICE_ROLE_KEY로 인증
    const authHeader = req.headers.get("authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Service role key required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createServiceClient();
    const dateKey = todayKey();

    // 내일 날짜 범위 (KST 기준)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);

    const tomorrowStart = new Date(kstNow);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // UTC로 변환
    const tomorrowStartUTC = new Date(tomorrowStart.getTime() - kstOffset).toISOString();
    const tomorrowEndUTC = new Date(tomorrowEnd.getTime() - kstOffset).toISOString();

    // 내일 예정 + status='recruiting' 세미나 조회
    const { data: seminars, error: semError } = await supabase
      .from("seminars")
      .select(`
        id,
        title,
        date,
        location,
        academy_id,
        academies (
          id,
          name
        )
      `)
      .eq("status", "recruiting")
      .gte("date", tomorrowStartUTC)
      .lte("date", tomorrowEndUTC);

    if (semError) {
      console.error("Seminars fetch error:", semError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch seminars" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!seminars || seminars.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No seminars tomorrow", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let totalSent = 0;

    for (const seminar of seminars) {
      const academy = seminar.academies as unknown as { id: string; name: string };
      const seminarAt = formatKoreanDateTime(seminar.date);
      const seminarPlace = getSeminarPlace(seminar.location);

      // 신청자 조회 (pending 또는 confirmed)
      const { data: applications, error: appError } = await supabase
        .from("seminar_applications")
        .select("user_id")
        .eq("seminar_id", seminar.id)
        .in("status", ["pending", "confirmed"]);

      if (appError) {
        console.error(`Applications fetch error for seminar ${seminar.id}:`, appError);
        continue;
      }

      if (!applications || applications.length === 0) continue;

      for (const app of applications) {
        const role = await getRoleFromUserId(supabase, app.user_id);
        const userRole = role === "student" ? "student" : "parent";

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", app.user_id)
          .maybeSingle();

        if (!profile?.phone) continue;

        const templateCode = templateForSeminarReminder(userRole);
        const detailUrl = seminarDetailUrlFor(userRole, seminar.id);
        const buttons: NotificationButton[] = [
          { name: "안내사항 확인", url: detailUrl },
          { name: "길찾기", url: mapUrlOrFallback(seminarPlace, detailUrl) },
        ];

        await sendNotification(supabase, {
          templateCode,
          recipientPhone: profile.phone,
          recipientUserId: app.user_id,
          receiverType: "user",
          variables: {
            seminarTitle: seminar.title,
            seminarAt,
            seminarPlace,
          },
          buttons,
          seminarId: seminar.id,
          academyId: academy.id,
          rateLimitKey: `daily:user:${app.user_id}:${dateKey}`,
        });

        totalSent++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        seminarsProcessed: seminars.length,
        remindersSent: totalSent,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("send-seminar-reminders error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
