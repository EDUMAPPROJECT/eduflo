import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-dev-bypass-key",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const devBypassHeader = req.headers.get("x-dev-bypass-key");
    const devBypassKey = Deno.env.get("DEV_BYPASS_KEY");
    const bypassAuth = !!devBypassKey && devBypassHeader === devBypassKey;

    if (!authHeader && !bypassAuth) {
      return new Response(JSON.stringify({ error: "인증이 필요합니다" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json()) as {
      userId?: string;
      tempPassword?: string;
      email?: string;
    };
    // GoTrue Admin URL + @supabase/auth-js validateUUID는 소문자 UUID만 허용.
    // DB는 대소문자 혼합 UUID도 매칭되지만 Admin API는 User not found가 날 수 있음.
    const userId =
      typeof body.userId === "string" ? body.userId.trim().toLowerCase() : "";
    const tempPassword = typeof body.tempPassword === "string" ? body.tempPassword : "";
    const requestedEmail = typeof body.email === "string" ? body.email.trim() : "";

    if (!userId || !tempPassword) {
      return new Response(JSON.stringify({ error: "필수 값이 누락되었습니다" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    if (!uuidRe.test(userId)) {
      return new Response(JSON.stringify({ error: "userId가 올바른 UUID 형식이 아닙니다" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (tempPassword.length < 8) {
      return new Response(JSON.stringify({ error: "임시 비밀번호는 8자 이상이어야 합니다" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });

    if (!bypassAuth) {
      const {
        data: { user: requester },
        error: requesterError,
      } = await authedClient.auth.getUser();

      if (requesterError || !requester) {
        return new Response(JSON.stringify({ error: "인증 사용자 확인에 실패했습니다" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { data: roleData, error: roleError } = await serviceClient
        .from("user_roles")
        .select("is_super_admin")
        .eq("user_id", requester.id)
        .maybeSingle();

      if (roleError || !roleData?.is_super_admin) {
        return new Response(JSON.stringify({ error: "슈퍼관리자 권한이 필요합니다" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // 1) Try direct password reset for existing Auth user
    const { error: updateAuthError } = await serviceClient.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (updateAuthError) {
      // 2) Fallback: recreate a fresh Auth user and reassign app UUIDs
      const msg = updateAuthError.message || "비밀번호 초기화 실패";
      const looksCorrupt =
        /database error loading user|unexpected_failure/i.test(msg) ||
        (updateAuthError as { status?: number }).status === 500;

      const looksMissing =
        /not\s*found|no\s*user|user\s*not\s*found|invalid.*user/i.test(msg) ||
        (updateAuthError as { status?: number }).status === 404;

      if (!looksCorrupt && !looksMissing) {
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // IMPORTANT:
      // Legacy/corrupted users may already "occupy" an email in auth.users, and GoTrue can throw
      // "Database error checking email" when checking duplicates. To ensure recovery works,
      // always use a unique placeholder email for the new Auth user.
      const legacyEmail =
        requestedEmail ||
        (
          await serviceClient
            .from("profiles")
            .select("email")
            .eq("id", userId)
            .maybeSingle()
        ).data?.email?.trim() ||
        "";

      const uniqueEmail = `${userId.replace(/-/g, "")}.${Date.now()}@legacy.eduflo.local`;

      const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
        email: uniqueEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: legacyEmail ? { legacy_email: legacyEmail } : undefined,
      });

      if (createErr || !created?.user?.id) {
        return new Response(
          JSON.stringify({
            error: `새 Auth 계정 생성에 실패했습니다: ${createErr?.message ?? "unknown"}`,
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const newUserId = created.user.id;

      const { data: reassignData, error: reassignErr } = await serviceClient.rpc(
        "reassign_user_uuid",
        {
          p_old: userId,
          p_new: newUserId,
        }
      );

      if (reassignErr) {
        return new Response(
          JSON.stringify({
            error:
              "새 Auth 계정은 생성되었지만 앱 데이터(user_id) 이동에 실패했습니다. 관리자에게 문의해주세요.",
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await serviceClient
        .from("user_roles")
        .update({ require_password_change: true })
        .eq("user_id", newUserId);

      return new Response(
        JSON.stringify({
          ok: true,
          mode: "recreated",
          old_user_id: userId,
          new_user_id: newUserId,
          login_email: uniqueEmail,
          legacy_email: legacyEmail || null,
          reassign: reassignData ?? null,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: updateRoleError } = await serviceClient
      .from("user_roles")
      .update({ require_password_change: true })
      .eq("user_id", userId);

    if (updateRoleError) {
      return new Response(JSON.stringify({ error: "변경 플래그 설정에 실패했습니다" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "비밀번호 초기화 중 오류가 발생했습니다" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
