import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import { Mail, Lock, ArrowRight, CheckCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { logError, getUserFriendlyMessage } from "@/lib/errorLogger";

type AuthStep = "login" | "signup" | "welcome";

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"parent" | "admin">(
    (searchParams.get("role") as "parent" | "admin") || "parent"
  );
  const [showPassword, setShowPassword] = useState(false);

  // Navigate based on server-side role from database
  const navigateByDatabaseRole = async (userId: string) => {
    try {
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        logError('role-fetch', error);
        // Default to parent home if role check fails
        navigate("/home");
        return;
      }
      
      // If no role found, default to parent
      if (!roleData) {
        navigate("/home");
        return;
      }
      
      if (roleData.role === "admin") {
        navigate("/admin/home");
      } else {
        navigate("/home");
      }
    } catch (error) {
      logError('navigate-by-role', error);
      navigate("/home");
    }
  };


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user && step !== "welcome") {
          if (event === "SIGNED_IN" && isNewUser) {
            setStep("welcome");
          } else if (event === "SIGNED_IN") {
            await navigateByDatabaseRole(session.user.id);
          }
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && step === "login") {
        await navigateByDatabaseRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, step, isNewUser]);


  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("이메일과 비밀번호를 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(getUserFriendlyMessage(error, "로그인에 실패했습니다"));
        return;
      }

      toast.success("로그인되었습니다");
      if (data.user) {
        await navigateByDatabaseRole(data.user.id);
      }
    } catch (error: unknown) {
      logError('login', error);
      toast.error("로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password) {
      toast.error("이메일과 비밀번호를 입력해주세요");
      return;
    }

    if (password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("이미 가입된 이메일입니다");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Auto-confirmed signup
      if (data.session) {
        setIsNewUser(true);
        setStep("welcome");
        toast.success("회원가입이 완료되었습니다");
      }
    } catch (error: unknown) {
      logError('signup', error);
      toast.error("회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };


  const handleContinue = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await navigateByDatabaseRole(session.user.id);
    } else {
      navigate("/home");
    }
  };


  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 animate-float">
          <Logo size="lg" />
        </div>

        {(step === "login" || step === "signup") && (
          <div className="w-full max-w-sm animate-fade-up">
            <h2 className="text-xl font-semibold text-foreground text-center mb-2">
              {step === "login" ? "로그인" : "회원가입"}
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-8">
              {step === "login" 
                ? "이메일로 로그인하세요" 
                : "새 계정을 만들어주세요"}
            </p>

            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button
                variant={selectedRole === "parent" ? "default" : "outline"}
                className="h-12"
                onClick={() => setSelectedRole("parent")}
              >
                학부모
              </Button>
              <Button
                variant={selectedRole === "admin" ? "default" : "outline"}
                className="h-12"
                onClick={() => setSelectedRole("admin")}
              >
                학원 원장님
              </Button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="이메일 주소"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 text-lg"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-14 text-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>

              {step === "signup" && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호 확인"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-12 h-14 text-lg"
                  />
                </div>
              )}

              <Button
                onClick={step === "login" ? handleLogin : handleSignup}
                disabled={loading}
                className="w-full h-14 text-base"
                size="xl"
              >
                {loading 
                  ? "처리 중..." 
                  : step === "login" 
                    ? "로그인" 
                    : "가입하기"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <div className="mt-6 text-center">
              {step === "login" ? (
                <p className="text-sm text-muted-foreground">
                  계정이 없으신가요?{" "}
                  <button
                    onClick={() => setStep("signup")}
                    className="text-primary font-medium hover:underline"
                  >
                    회원가입
                  </button>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  이미 계정이 있으신가요?{" "}
                  <button
                    onClick={() => setStep("login")}
                    className="text-primary font-medium hover:underline"
                  >
                    로그인
                  </button>
                </p>
              )}
            </div>
          </div>
        )}


        {step === "welcome" && (
          <div className="w-full max-w-sm animate-fade-up text-center">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 shadow-soft">
              <CheckCircle className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-2">
              에듀맵에 오신 것을 환영합니다!
            </h2>
            <p className="text-muted-foreground mb-8">
              이제 우리 동네 학원을 쉽게 찾아보세요
            </p>

            <Button
              onClick={handleContinue}
              className="w-full h-14 text-base"
              size="xl"
            >
              시작하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
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
