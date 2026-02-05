export type AuthRole = "parent" | "student" | "admin";

/**
 * Firebase ID Token을 백엔드로 전송합니다.
 * - 로그인: POST /auth/firebase-login { idToken, role }
 * - 회원가입: POST /auth/firebase-signup { idToken, role }
 */
export async function sendIdTokenToBackend(
  idToken: string,
  role: AuthRole,
  isSignup: boolean
): Promise<{ ok: boolean; error?: string }> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";
  if (!backendUrl) {
    return { ok: true };
  }
  const url = isSignup ? `${backendUrl}/auth/firebase-signup` : `${backendUrl}/auth/firebase-login`;
  const body = { idToken, role };
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
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "서버 연결에 실패했습니다" };
  }
}
