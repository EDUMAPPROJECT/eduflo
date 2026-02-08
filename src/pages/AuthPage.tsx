import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { firebaseAuth } from "@/integrations/firebase/client";
import { signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import { Lock, ArrowRight, Phone, Mail, ArrowLeft, User } from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/lib/errorLogger";
import { sendIdTokenToBackend, type AuthRole } from "@/lib/sendIdTokenToBackend";
import { formatPhoneWithDash, getDigitsOnly } from "@/lib/formatPhone";
import { supabase } from "@/integrations/supabase/client";

type AuthStep = "login" | "signup";
type AuthMode = "phone" | "email";

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "email" ? "email" : "phone";
  
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>("login");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AuthRole>("parent");
  
  // Phone auth states
  const [loginPhone, setLoginPhone] = useState("");
  const [loginShowVerification, setLoginShowVerification] = useState(false);
  const [loginVerificationCode, setLoginVerificationCode] = useState("");
  const [verificationSecondsLeft, setVerificationSecondsLeft] = useState(0); // 5분 = 300초
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [recaptchaKey, setRecaptchaKey] = useState(0);
  const pendingPhoneRef = useRef<string | null>(null);
  const [signupName, setSignupName] = useState(""); // 회원가입 실명

  // Email auth states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const resetVerificationState = () => {
    setLoginShowVerification(false);
    setLoginVerificationCode("");
    setVerificationSecondsLeft(0);
    confirmationResultRef.current = null;
  };

  const resetEmailState = () => {
    setEmail("");
    setPassword("");
  };

  // Email login handler
  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("이메일과 비밀번호를 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) {
        toast.error(error.message || "로그인에 실패했습니다");
        return;
      }
      if (data?.session?.user?.id) {
        await navigateByDatabaseRole(data.session.user.id);
        toast.success("로그인되었습니다");
      }
    } catch (error) {
      logError("email-login", error);
      toast.error("로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  // Email signup handler
  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("이메일과 비밀번호를 입력해주세요");
      return;
    }
    if (password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        toast.error(error.message || "회원가입에 실패했습니다");
        return;
      }
      if (data?.user?.id) {
        // Create user role
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: selectedRole,
        });
        if (roleError) {
          logError("email-signup-role", roleError);
        }
        toast.success("회원가입이 완료되었습니다. 이메일을 확인해주세요.");
        setStep("login");
        resetEmailState();
      }
    } catch (error) {
      logError("email-signup", error);
      toast.error("회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
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
    // invisible reCAPTCHA는 Firebase 권장대로 '인증번호 받기' 버튼에 바인딩 (도메인 검증 시 필요)
    const buttonEl = document.getElementById("firebase-phone-auth-button") ?? container;
    let cancelled = false;
    (async () => {
      try {
        const verifier = new RecaptchaVerifier(firebaseAuth, buttonEl, {
          size: "invisible",
        });
        if (cancelled) return;
        const result = await signInWithPhoneNumber(firebaseAuth, phoneNum, verifier);
        if (cancelled) return;
        confirmationResultRef.current = result;
        setLoginShowVerification(true);
        setVerificationSecondsLeft(300); // 5분
        toast.success("인증번호가 발송되었습니다. SMS를 확인해주세요.");
      } catch (error: unknown) {
        if (cancelled) return;
        logError("firebase-phone-request", error);
        const code = error && typeof error === "object" && "code" in error ? String((error as { code: string }).code) : "";
        const msg = error && typeof error === "object" && "message" in error ? String((error as { message: string }).message) : "인증번호 발송에 실패했습니다";
        if (code === "auth/invalid-app-credential") {
          toast.error("앱 인증에 실패했습니다. 배포된 주소에서 시도하거나, Firebase 콘솔에서 허용 도메인을 확인해주세요.");
        } else {
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recaptchaKey]);

  // 5분 입력 제한 타이머
  useEffect(() => {
    if (!loginShowVerification || verificationSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setVerificationSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [loginShowVerification, verificationSecondsLeft]);

  const handleResendCode = () => {
    if (loading) return;
    if (!loginPhone.trim()) {
      toast.error("휴대폰 번호를 확인해주세요");
      return;
    }
    setLoading(true);
    pendingPhoneRef.current = loginPhone.trim();
    setRecaptchaKey((k) => k + 1);
  };

  const formatTimeLeft = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

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
      const { ok, error: backendError, token_hash } = await sendIdTokenToBackend(idToken, selectedRole, false);
      if (!ok) {
        toast.error(backendError ?? "서버 인증 처리에 실패했습니다");
        return;
      }
      if (token_hash) {
        const { data, error: otpError } = await supabase.auth.verifyOtp({
          token_hash,
          type: "magiclink",
        });
        if (otpError) {
          logError("supabase-verify-otp", otpError);
          toast.error("세션 설정에 실패했습니다. 다시 로그인해주세요.");
          return;
        }
        if (data?.session?.user?.id) {
          await navigateByDatabaseRole(data.session.user.id);
        } else {
          navigate("/p/home");
        }
      } else {
        navigate("/p/home");
      }
      toast.success("로그인되었습니다");
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
    const trimmedName = signupName.trim();
    if (!trimmedName) {
      toast.error("실명(이름)을 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await confirmation.confirm(loginVerificationCode.trim());
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      const { ok, error: backendError, token_hash } = await sendIdTokenToBackend(idToken, selectedRole, true, trimmedName);
      if (!ok) {
        toast.error(backendError ?? "회원가입 처리에 실패했습니다");
        return;
      }
      if (token_hash) {
        const { data, error: otpError } = await supabase.auth.verifyOtp({
          token_hash,
          type: "magiclink",
        });
        if (otpError) {
          logError("supabase-verify-otp", otpError);
          toast.error("세션 설정에 실패했습니다. 로그인해주세요.");
          return;
        }
        if (data?.session?.user?.id) {
          await navigateByDatabaseRole(data.session.user.id);
        } else {
          navigate("/p/home");
        }
      } else {
        navigate("/p/home");
      }
      toast.success("회원가입이 완료되었습니다");
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
        {/* Back button for email mode */}
        {authMode === "email" && (
          <button
            onClick={() => {
              setAuthMode("phone");
              resetEmailState();
              navigate("/auth");
            }}
            className="absolute top-4 left-4 p-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}

        {/* Logo */}
        <div className="mb-8 animate-float">
          <Logo size="lg" />
        </div>

        <div className="w-full max-w-sm animate-fade-up">
          <h2 className="text-xl font-semibold text-foreground text-center mb-2">
            {step === "login" ? "로그인" : "회원가입"}
          </h2>
          <p className="text-muted-foreground text-sm text-center mb-6">
            {authMode === "email"
              ? step === "login"
                ? "이메일로 로그인하세요"
                : "이메일로 회원가입하세요"
              : step === "login"
                ? "휴대폰 번호로 로그인하세요"
                : "가입 유형을 선택하고 휴대폰 번호로 회원가입하세요"}
          </p>

          {/* Role selection (for signup) */}
          {step === "signup" && (
            <div className="grid grid-cols-3 gap-2 mb-4">
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
          )}

          {/* 실명 (휴대폰 회원가입 시, 가입 유형 선택 밑) */}
          {step === "signup" && authMode === "phone" && (
            <div className="relative mb-4">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="이름"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                className="pl-12 h-14 text-lg"
                disabled={loginShowVerification}
              />
            </div>
          )}

          {/* Email Auth Form */}
          {authMode === "email" && (
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 text-lg"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 text-lg"
                />
              </div>

              {step === "login" ? (
                <Button
                  onClick={handleEmailLogin}
                  disabled={loading}
                  className="w-full h-14 text-base"
                  size="xl"
                >
                  {loading ? "로그인 중..." : "로그인"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleEmailSignup}
                  disabled={loading}
                  className="w-full h-14 text-base"
                  size="xl"
                >
                  {loading ? "처리 중..." : "가입하기"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          )}

          {/* Phone Auth Form */}
          {authMode === "phone" && (
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
                <>
                  <div className="space-y-1">
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="SMS 인증 코드"
                        value={loginVerificationCode}
                        onChange={(e) => setLoginVerificationCode(e.target.value)}
                        className="pl-12 pr-14 h-14 text-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground tabular-nums">
                        {formatTimeLeft(verificationSecondsLeft)}
                      </span>
                    </div>
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={loading}
                        className="text-sm text-primary font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                      >
                        {verificationSecondsLeft > 0
                          ? "인증번호가 오지 않나요?"
                          : "인증번호 다시 받기"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {!loginShowVerification ? (
                <Button
                  id="firebase-phone-auth-button"
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
          )}

          <div className="mt-6 text-center">
            {step === "login" ? (
              <p className="text-sm text-muted-foreground">
                계정이 없으신가요?{" "}
                <button
                  onClick={() => {
                    setStep("signup");
                    resetVerificationState();
                    resetEmailState();
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
                    resetEmailState();
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
