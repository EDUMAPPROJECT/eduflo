import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

const LearningStyleBanner = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-5 shadow-lg cursor-pointer group"
      onClick={() => navigate("/preference-test")}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-primary-foreground text-sm mb-1">
            1분 만에 끝내는 맞춤 추천 테스트
          </h3>
          <p className="text-primary-foreground/80 text-xs">
            우리 아이에게 딱 맞는 학원을 찾아보세요
          </p>
        </div>
        <Button 
          size="sm" 
          variant="secondary"
          className="flex-shrink-0 gap-1 group-hover:gap-2 transition-all"
        >
          시작
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default LearningStyleBanner;