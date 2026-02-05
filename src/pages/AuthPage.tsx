import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { firebaseAuth } from "@/integrations/firebase/client";
import { signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import { Lock, ArrowRight, Phone } from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/lib/errorLogger";
import { sendIdTokenToBackend, type AuthRole } from "@/lib/sendIdTokenToBackend";
import { formatPhoneWithDash, getDigitsOnly } from "@/lib/formatPhone";
import { supabase } from "@/integrations/supabase/client";

type AuthStep = "login" | "signup";

const AuthPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<AuthStep>("login");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AuthRole>("parent");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginShowVerification, setLoginShowVerification] = useState(false);
  const [loginVerificationCode, setLoginVerificationCode] = useState("");
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [recaptchaKey, setRecaptchaKey] = useState(0);
  const pendingPhoneRef = useRef<string | null>(null);

  const resetVerificationState = () => {
    setLoginShowVerification(false);
    setLoginVerificationCode("");
    confirmationResultRef.current = null;
  };

  // Navigate based on server-side role from database
  const navigateByDatabaseRole = async (userId: string) => {
    try {
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role, is_super_admin')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        logError('role-fetch', error);
        navigate("/p/home");
        return;
      }
      
      // If no role found, default to parent
      if (!roleData) {
        navigate("/p/home");
        return;
      }
      
      // Check super admin first
      if (roleData.is_super_admin) {
        navigate("/super/home");
      } else if (roleData.role === "admin") {
        navigate("/admin/home");
      } else if (roleData.role === "student") {
        navigate("/s/home");
      } else {
        navigate("/p/home");
      }
    } catch (error) {
      logError('navigate-by-role', error);
      navigate("/p/home");
    }
  };


  const handleLoginRequestCode = () => {
    if (!loginPhone.trim()) {
      toast.error("휴대폰 번호를 입력해주세요");
      return;
    }
    setLoading(true);
    pendingPhoneRef.current = loginPhone.trim();
    setRecaptchaKey((k) => k + 1);
  };

  useEffect(() => {
    if (recaptchaKey === 0) return;
    const phone = pendingPhoneRef.current;
    const container = recaptchaContainerRef.current;
    if (!phone || !container) {
      setLoading(false);
      return;
    }
    pendingPhoneRef.current = null;
    const digits = getDigitsOnly(phone);
    const phoneNum = digits.startsWith("82") ? `+${digits}` : `+82${digits.replace(/^0/, "")}`;
    let cancelled = false;
    (async () => {
      try {
        const verifier = new RecaptchaVerifier(firebaseAuth, container, {
          size: "invisible",
        });
        if (cancelled) return;
        const result = await signInWithPhoneNumber(firebaseAuth, phoneNum, verifier);
        if (cancelled) return;
        confirmationResultRef.current = result;
        setLoginShowVerification(true);
        toast.success("인증번호가 발송되었습니다. SMS를 확인해주세요.");
      } catch (error: unknown) {
        if (cancelled) return;
        logError("firebase-phone-request", error);
        const msg = error && typeof error === "object" && "message" in error ? String((error as { message: string }).message) : "인증번호 발송에 실패했습니다";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recaptchaKey]);

  const handleLoginConfirm = async () => {
    const confirmation = confirmationResultRef.current;
    if (!confirmation || !loginVerificationCode.trim()) {
      toast.error("인증번호를 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await confirmation.confirm(loginVerificationCode.trim());
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      const { ok, error: backendError } = await sendIdTokenToBackend(idToken, selectedRole, false);
      if (!ok) {
        toast.error(backendError ?? "서버 인증 처리에 실패했습니다");
        return;
      }
      toast.success("로그인되었습니다");
      navigate("/p/home");
    } catch (error: unknown) {
      logError("firebase-phone-confirm", error);
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message: string }).message) : "인증에 실패했습니다";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupConfirm = async () => {
    const confirmation = confirmationResultRef.current;
    if (!confirmation || !loginVerificationCode.trim()) {
      toast.error("인증번호를 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await confirmation.confirm(loginVerificationCode.trim());
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      const { ok, error: backendError } = await sendIdTokenToBackend(idToken, selectedRole, true);
      if (!ok) {
        toast.error(backendError ?? "회원가입 처리에 실패했습니다");
        return;
      }
      toast.success("회원가입이 완료되었습니다");
      navigate("/p/home");
    } catch (error: unknown) {
      logError("firebase-signup-confirm", error);
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message: string }).message) : "인증에 실패했습니다";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 animate-float">
          <Logo size="lg" />
        </div>

        <div className="w-full max-w-sm animate-fade-up">
          <h2 className="text-xl font-semibold text-foreground text-center mb-2">
            {step === "login" ? "로그인" : "회원가입"}
          </h2>
          <p className="text-muted-foreground text-sm text-center mb-6">
            {step === "login"
              ? "휴대폰 번호로 로그인하세요"
              : "가입 유형을 선택한 뒤 휴대폰 인증을 진행해주세요"}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-6">
              <Button
                variant={selectedRole === "parent" ? "default" : "outline"}
                className="h-12 text-sm px-2"
                onClick={() => setSelectedRole("parent")}
              >
                학부모
              </Button>
              <Button
                variant={selectedRole === "student" ? "default" : "outline"}
                className="h-12 text-sm px-2"
                onClick={() => setSelectedRole("student")}
              >
                학생
              </Button>
              <Button
                variant={selectedRole === "admin" ? "default" : "outline"}
                className="h-12 text-sm px-2"
                onClick={() => setSelectedRole("admin")}
              >
                학원
              </Button>
            </div>

          <div className="space-y-4">
            <div key={recaptchaKey} ref={recaptchaContainerRef} id="firebase-recaptcha" className="sr-only" aria-hidden />
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="휴대폰 번호"
                value={loginPhone}
                onChange={(e) => setLoginPhone(formatPhoneWithDash(e.target.value))}
                className="pl-12 h-14 text-lg"
                disabled={loginShowVerification}
              />
            </div>
            {loginShowVerification && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="SMS 인증 코드"
                  value={loginVerificationCode}
                  onChange={(e) => setLoginVerificationCode(e.target.value)}
                  className="pl-12 h-14 text-lg"
                />
              </div>
            )}

            {!loginShowVerification ? (
              <Button
                onClick={handleLoginRequestCode}
                disabled={loading}
                className="w-full h-14 text-base"
                size="xl"
              >
                {loading ? "발송 중..." : "인증번호 받기"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : step === "login" ? (
              <Button
                onClick={handleLoginConfirm}
                disabled={loading}
                className="w-full h-14 text-base"
                size="xl"
              >
                {loading ? "처리 중..." : "로그인"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSignupConfirm}
                disabled={loading}
                className="w-full h-14 text-base"
                size="xl"
              >
                {loading ? "처리 중..." : "가입하기"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>

          <div className="mt-6 text-center">
            {step === "login" ? (
              <p className="text-sm text-muted-foreground">
                계정이 없으신가요?{" "}
                <button
                  onClick={() => {
                    setStep("signup");
                    resetVerificationState();
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  회원가입
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                이미 계정이 있으신가요?{" "}
                <button
                  onClick={() => {
                    setStep("login");
                    resetVerificationState();
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  로그인
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 px-6">
        <p className="text-xs text-muted-foreground">
          시작하면 서비스 이용약관과 개인정보처리방침에 동의하게 됩니다
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
