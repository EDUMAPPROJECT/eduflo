import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { useRoutePrefix } from "@/hooks/useRoutePrefix";

interface Seminar {
  id: string;
  title: string;
  date: string;
  image_url: string | null;
  academy_id?: string | null;
  academy?: {
    name: string;
  } | null;
  author?: {
    user_name: string | null;
  } | null;
}

interface SeminarCarouselProps {
  seminars: Seminar[];
  loading: boolean;
}

const SeminarCarousel = ({ seminars, loading }: SeminarCarouselProps) => {
  const navigate = useNavigate();
  const prefix = useRoutePrefix();

  const getDDay = (dateStr: string) => {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diff = differenceInDays(targetDate, today);
    if (diff === 0) return "D-Day";
    if (diff > 0) return `D-${diff}`;
    return "종료";
  };

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 px-4">
          <h3 className="font-bold text-foreground">🎯 지금 신청 가능한 설명회</h3>
          <span className="text-sm text-primary">전체보기</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="flex-shrink-0 w-40 overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (seminars.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h3 className="font-bold text-foreground">🎯 지금 신청 가능한 설명회</h3>
        <button 
          onClick={() => navigate(`${prefix}/explore?tab=seminars`)}
          className="flex items-center text-sm text-primary font-medium"
        >
          전체보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
        {seminars.map((seminar) => {
          const dDay = getDDay(seminar.date);
          const isUrgent = dDay === "D-Day" || (dDay.startsWith("D-") && parseInt(dDay.slice(2)) <= 3);

          // Parse image URL - could be JSON array or single URL
          const getFirstImageUrl = (): string | null => {
            if (!seminar.image_url) return null;
            
            // First, check if it's already a valid URL (not JSON)
            if (seminar.image_url.startsWith('http://') || seminar.image_url.startsWith('https://')) {
              return seminar.image_url;
            }
            
            try {
              const parsed = JSON.parse(seminar.image_url);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed[0];
              }
              return typeof parsed === 'string' ? parsed : seminar.image_url;
            } catch {
              return seminar.image_url;
            }
          };

          const thumbnailUrl = getFirstImageUrl();

          return (
            <Card
              key={seminar.id}
              className="flex-shrink-0 w-40 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-border"
              onClick={() => navigate(`${prefix}/seminar/${seminar.id}`)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-square bg-muted">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={seminar.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <span className="text-3xl">📚</span>
                  </div>
                )}
                {/* D-Day Badge */}
                <Badge
                  className={`absolute top-2 left-2 text-xs ${
                    isUrgent
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {dDay}
                </Badge>
              </div>

              {/* Content */}
              <div className="p-3">
                <p className="text-xs text-muted-foreground mb-1 truncate">
                  {seminar.academy_id && seminar.academy 
                    ? seminar.academy.name 
                    : (seminar.author?.user_name || "운영자")}
                </p>
                <h4 className="font-medium text-foreground text-sm line-clamp-2 leading-tight mb-2">
                  {seminar.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(seminar.date), "M/d(EEE) a h시", { locale: ko })}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default SeminarCarousel;