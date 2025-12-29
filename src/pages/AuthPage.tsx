import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import { Phone, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type AuthStep = "phone" | "otp" | "welcome";

const AuthPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"parent" | "admin">("parent");

  useEffect(() => {
    // Check if already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user && step !== "welcome") {
          // Check if new signup
          if (event === "SIGNED_IN" && isNewUser) {
            setStep("welcome");
          } else if (event === "SIGNED_IN") {
            navigate("/home");
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && step === "phone") {
        navigate("/home");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, step, isNewUser]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Format as Korean phone number
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const getFullPhoneNumber = () => {
    const digits = phone.replace(/\D/g, "");
    // Convert Korean phone format to international
    if (digits.startsWith("010")) {
      return `+82${digits.slice(1)}`;
    }
    return `+82${digits}`;
  };

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("올바른 휴대폰 번호를 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = getFullPhoneNumber();
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: {
          data: {
            role: selectedRole,
          },
        },
      });

      if (error) {
        if (error.message.includes("not enabled")) {
          // For demo, skip OTP and show welcome
          toast.info("데모 모드: OTP 인증을 건너뜁니다");
          setIsNewUser(true);
          setStep("welcome");
        } else {
          throw error;
        }
      } else {
        setStep("otp");
        toast.success("인증번호가 발송되었습니다");
      }
    } catch (error: any) {
      console.error("OTP send error:", error);
      toast.error("인증번호 발송에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("6자리 인증번호를 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = getFullPhoneNumber();
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: "sms",
      });

      if (error) throw error;

      // Check if this is a new user
      if (data.user?.created_at) {
        const createdAt = new Date(data.user.created_at);
        const now = new Date();
        const diffMs = now.getTime() - createdAt.getTime();
        const isRecent = diffMs < 60000; // Created within last minute
        
        if (isRecent) {
          setIsNewUser(true);
          setStep("welcome");
        } else {
          navigate("/home");
        }
      }
    } catch (error: any) {
      console.error("OTP verify error:", error);
      toast.error("인증번호가 올바르지 않습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 animate-float">
          <Logo size="lg" />
        </div>

        {step === "phone" && (
          <div className="w-full max-w-sm animate-fade-up">
            <h2 className="text-xl font-semibold text-foreground text-center mb-2">
              휴대폰 번호로 시작하기
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-8">
              본인 인증을 위해 휴대폰 번호를 입력해주세요
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
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="pl-12 h-14 text-lg"
                  maxLength={13}
                />
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={loading || phone.replace(/\D/g, "").length < 10}
                className="w-full h-14 text-base"
                size="xl"
              >
                {loading ? "발송 중..." : "인증번호 받기"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="w-full max-w-sm animate-fade-up">
            <h2 className="text-xl font-semibold text-foreground text-center mb-2">
              인증번호 입력
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-8">
              {phone}으로 발송된 6자리 인증번호를 입력해주세요
            </p>

            <div className="flex justify-center mb-6">
              <InputOTP
                value={otp}
                onChange={setOtp}
                maxLength={6}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                  <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                  <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                  <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                  <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                  <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full h-14 text-base"
              size="xl"
            >
              {loading ? "확인 중..." : "인증하기"}
            </Button>

            <button
              onClick={() => setStep("phone")}
              className="w-full mt-4 text-sm text-muted-foreground hover:text-primary"
            >
              휴대폰 번호 다시 입력
            </button>
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
