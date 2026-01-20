import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { GraduationCap, Building2, User } from "lucide-react";

const RoleSelection = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role: "parent" | "admin" | "student") => {
    // Navigate to auth with role preference
    navigate(`/auth?role=${role}`);
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Logo with animation */}
        <div className="animate-float mb-8">
          <Logo size="lg" />
        </div>

        {/* Tagline */}
        <div className="text-center mb-12 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            우리 동네 학원 찾기
          </h1>
          <p className="text-muted-foreground text-sm">
            내 아이에게 딱 맞는 학원을 찾아보세요
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="w-full max-w-sm space-y-4 animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <Button
            variant="role"
            size="xl"
            className="w-full flex items-center gap-4 h-auto py-5"
            onClick={() => handleRoleSelect("parent")}
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-base">학부모로 시작하기</div>
              <div className="text-xs text-muted-foreground font-normal">
                우리 아이 학원 찾기
              </div>
            </div>
          </Button>

          <Button
            variant="role"
            size="xl"
            className="w-full flex items-center gap-4 h-auto py-5"
            onClick={() => handleRoleSelect("student")}
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <User className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-base">학생으로 시작하기</div>
              <div className="text-xs text-muted-foreground font-normal">
                내 학원 일정 관리
              </div>
            </div>
          </Button>

          <Button
            variant="role"
            size="xl"
            className="w-full flex items-center gap-4 h-auto py-5"
            onClick={() => handleRoleSelect("admin")}
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-accent" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-base">학원으로 시작하기</div>
              <div className="text-xs text-muted-foreground font-normal">
                학원 등록 또는 기존 학원 참여
              </div>
            </div>
          </Button>
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

export default RoleSelection;
