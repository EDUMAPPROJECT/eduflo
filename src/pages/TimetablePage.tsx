import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNavigation from "@/components/BottomNavigation";

const TimetablePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">시간표</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto py-6 px-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">시간표 기능 준비중</h2>
          <p className="text-muted-foreground text-sm">
            곧 학원 수업 시간표를 확인할 수 있는<br />
            기능이 추가될 예정입니다.
          </p>
        </div>

        {/* Placeholder Cards */}
        <div className="space-y-3 mt-8">
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">수업 일정 관리</p>
                <p className="text-xs text-muted-foreground">등록한 학원의 수업 시간을 한눈에</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">알림 기능</p>
                <p className="text-xs text-muted-foreground">수업 시작 전 알림을 받아보세요</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default TimetablePage;
