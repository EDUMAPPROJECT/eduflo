export type AuthRole = "parent" | "student" | "admin";

/**
 * Firebase ID Token을 백엔드로 전송합니다.
 * - 로그인: POST /auth/firebase-login { idToken, role }
 * - 회원가입: POST /auth/firebase-signup { idToken, role, user_name }
 * 성공 시 백엔드가 token_hash를 반환하면 클라이언트에서 Supabase 세션 생성에 사용합니다.
 */
export async function sendIdTokenToBackend(
  idToken: string,
  role: AuthRole,
  isSignup: boolean,
  userName?: string
): Promise<{ ok: boolean; error?: string; token_hash?: string }> {
  // Lovable 등에서 Supabase만 관리할 때는 VITE_SUPABASE_URL로 Edge Function 호출
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_SUPABASE_URL ?? "";
  if (!backendUrl) {
    return { ok: true };
  }
  const path = isSignup ? "firebase-signup" : "firebase-login";
  const base = backendUrl.replace(/\/$/, "");
  const url = base.includes("/functions/v1") ? `${base}/${path}` : `${base}/functions/v1/${path}`;
  const body = isSignup && userName ? { idToken, role, user_name: userName } : { idToken, role };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data?.error ?? "인증 처리에 실패했습니다" };
    }
    const data = await res.json().catch(() => ({}));
    return {
      ok: true,
      ...(typeof data?.token_hash === "string" && { token_hash: data.token_hash }),
    };
  } catch (e) {
    return { ok: false, error: "서버 연결에 실패했습니다" };
  }
}
