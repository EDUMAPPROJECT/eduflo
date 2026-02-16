import { Link, useLocation } from "react-router-dom";
import { Megaphone, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 정식 출시 전 안내 가림 배너.
 * 로그인 후 설명회 관련이 아닌 경로에서만 표시되며, 화면을 덮고 안내 문구를 보여줍니다.
 */
const FormalReleaseBanner = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // 역할별 홈 경로 (설명회 목록이 있는 곳으로 이동)
  const getHomePath = () => {
    if (pathname.startsWith("/s/")) return "/s/home";
    if (pathname.startsWith("/admin")) return "/admin/home";
    if (pathname.startsWith("/super")) return "/super/home";
    if (pathname.startsWith("/academy")) return "/academy/dashboard";
    return "/p/home";
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
      aria-modal="true"
      role="dialog"
      aria-label="정식 출시 안내"
    >
      <div className="max-w-sm w-full rounded-2xl border bg-card p-6 shadow-lg text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Megaphone className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">정식 출시 준비 중입니다</h2>
          <p className="text-sm text-muted-foreground">
            현재 <strong>설명회 신청</strong> 기능만 이용 가능합니다.
            <br />
            다른 기능은 정식 출시 후 이용해 주세요.
          </p>
        </div>
        <Button asChild className="w-full gap-2">
          <Link to={getHomePath()}>
            <CalendarCheck className="h-4 w-4" />
            설명회 보러 가기
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default FormalReleaseBanner;