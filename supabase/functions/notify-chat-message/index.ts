import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createServiceClient,
  corsHeaders,
  sendNotification,
  chatUrlFor,
  templateForChatToUser,
  formatKoreanDateTime,
  getRoleFromUserId,
  todayKey,
  checkRateLimit,
} from "../_shared/notification.ts";

interface RequestBody {
  chatRoomId: string;
  messageContent: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();

    // JWT에서 sender 확인
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

    const { chatRoomId, messageContent }: RequestBody = await req.json();
    if (!chatRoomId) {
      return new Response(
        JSON.stringify({ error: "chatRoomId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 채팅방 쿨다운 확인 (1분 1회)
    const chatRateLimitKey = `chat:${chatRoomId}`;
    const chatAllowed = await checkRateLimit(supabase, chatRateLimitKey, 1, 1);
    if (!chatAllowed) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Chat cooldown" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // chat_rooms JOIN academies 조회
    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .select(`
        id,
        parent_id,
        staff_user_id,
        academy_id,
        academies (
          id,
          name,
          owner_id
        )
      `)
      .eq("id", chatRoomId)
      .single();

    if (roomError || !room) {
      console.error("Room fetch error:", roomError);
      return new Response(
        JSON.stringify({ error: "Chat room not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const academy = room.academies as unknown as {
      id: string;
      name: string;
      owner_id: string | null;
    };
    const receivedAt = formatKoreanDateTime(new Date().toISOString());
    const senderRole = await getRoleFromUserId(supabase, user.id);
    const dateKey = todayKey();

    // sender의 프로필 조회 (이름)
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("user_name")
      .eq("id", user.id)
      .maybeSingle();

    const senderName = senderProfile?.user_name || "회원";

    // 메시지 주제 (첫 20자)
    const inquiryTopic = messageContent
      ? messageContent.slice(0, 20) + (messageContent.length > 20 ? "..." : "")
      : "메시지";

    if (senderRole === "parent" || senderRole === "student") {
      // 학부모/학생 → 학원에게 알림
      const recipientUserId = room.staff_user_id || academy.owner_id;
      if (!recipientUserId) {
        return new Response(
          JSON.stringify({ success: false, error: "No academy recipient found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", recipientUserId)
        .maybeSingle();

      if (!recipientProfile?.phone) {
        return new Response(
          JSON.stringify({ success: false, error: "Recipient phone not found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const result = await sendNotification(supabase, {
        templateCode: "TPL_CHAT_TO_ACADEMY_V1",
        recipientPhone: recipientProfile.phone,
        recipientUserId,
        receiverType: "academy",
        variables: {
          academyName: academy.name,
          senderName,
          inquiryTopic,
          receivedAt,
        },
        buttons: [
          { name: "채팅 확인하기", url: chatUrlFor("academy", chatRoomId) },
        ],
        chatRoomId,
        academyId: academy.id,
        rateLimitKey: chatRateLimitKey,
      });

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      // 학원 멤버 → 학부모/학생에게 알림
      const recipientUserId = room.parent_id;
      const recipientRole = await getRoleFromUserId(supabase, recipientUserId);
      const userRole = recipientRole === "student" ? "student" : "parent";

      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", recipientUserId)
        .maybeSingle();

      if (!recipientProfile?.phone) {
        return new Response(
          JSON.stringify({ success: false, error: "Recipient phone not found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const templateCode = templateForChatToUser(userRole);

      const result = await sendNotification(supabase, {
        templateCode,
        recipientPhone: recipientProfile.phone,
        recipientUserId,
        receiverType: "user",
        variables: {
          academyName: academy.name,
          receivedAt,
        },
        buttons: [
          { name: "답장하러 가기", url: chatUrlFor(userRole, chatRoomId) },
        ],
        chatRoomId,
        academyId: academy.id,
        rateLimitKey: chatRateLimitKey,
      });

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("notify-chat-message error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
