import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNavigation from "@/components/BottomNavigation";

const TimetablePage = () => {
  const navigate = useNavigate();

  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const hours = Array.from({ length: 14 }, (_, i) => i + 9); // 09:00 ~ 22:00

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

      {/* Weekly Calendar */}
      <main className="max-w-lg mx-auto py-4 px-2">
        <div className="overflow-x-auto">
          <div className="min-w-[360px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 gap-px bg-border rounded-t-lg overflow-hidden">
              <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                시간
              </div>
              {days.map((day) => (
                <div
                  key={day}
                  className="bg-muted p-2 text-center text-xs font-medium text-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="border border-t-0 border-border rounded-b-lg overflow-hidden">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 gap-px bg-border">
                  {/* Time Label */}
                  <div className="bg-muted/50 p-2 text-center text-xs text-muted-foreground flex items-center justify-center">
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                  {/* Day Cells */}
                  {days.map((day) => (
                    <div
                      key={`${day}-${hour}`}
                      className="bg-card h-10 hover:bg-primary/5 transition-colors cursor-pointer"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          수업 일정을 등록하면 이곳에 표시됩니다
        </p>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default TimetablePage;
