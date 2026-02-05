import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("82")) return `+${digits}`;
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  return `+82${digits}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { phone } = (await req.json()) as { phone?: string };

    if (!phone || typeof phone !== "string") {
      return new Response(
        JSON.stringify({ error: "휴대폰 번호를 입력해주세요" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // profiles에서 휴대폰 번호로 사용자 조회 (E.164 형식)
    const { data: profileByE164, error: err1 } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    let profile = profileByE164;
    let profileError = err1;

    if (!profile && normalizedPhone.startsWith("+82")) {
      const altPhone = "0" + normalizedPhone.slice(3);
      const res = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", altPhone)
        .maybeSingle();
      profile = res.data;
      profileError = res.error;
    }

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "가입된 휴대폰 번호가 아닙니다" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = profile.id;
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "사용자 정보를 찾을 수 없습니다" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // generateLink는 email 필요. 휴대폰 전용 사용자는 email이 없을 수 있음
    let email = user.email;
    if (!email || !email.length) {
      const placeholderEmail = `${userId.replace(/-/g, "")}@phone.eduflo.local`;
      await supabase.auth.admin.updateUserById(userId, { email: placeholderEmail });
      email = placeholderEmail;
    }

    const {
      data: linkData,
      error: linkError,
    } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      return new Response(
        JSON.stringify({ error: "로그인 처리에 실패했습니다" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ token_hash: linkData.properties.hashed_token }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "로그인 처리 중 오류가 발생했습니다" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
