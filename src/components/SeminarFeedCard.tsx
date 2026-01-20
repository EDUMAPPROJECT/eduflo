import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Heart,
  Share2,
  ChevronRight,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRoutePrefix } from "@/hooks/useRoutePrefix";

interface SeminarFeedCardProps {
  id: string;
  title: string;
  date: string;
  location: string | null;
  imageUrl: string | null;
  subject: string | null;
  targetGrade: string | null;
  status: "recruiting" | "closed";
  academy?: {
    name: string;
    profile_image?: string | null;
  } | null;
}

const SeminarFeedCard = ({
  id,
  title,
  date,
  location,
  imageUrl,
  subject,
  targetGrade,
  status,
  academy,
}: SeminarFeedCardProps) => {
  const navigate = useNavigate();
  const prefix = useRoutePrefix();
  const [isLiked, setIsLiked] = useState(false);

  // Calculate D-Day
  const getDDay = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seminarDate = new Date(date);
    seminarDate.setHours(0, 0, 0, 0);
    const diffTime = seminarDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "D-Day";
    if (diffDays > 0 && diffDays <= 7) return `D-${diffDays}`;
    return null;
  };

  const formatDate = (dateString: string) => {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const dDay = getDDay();
  const isUrgent = dDay && dDay !== "D-Day" && parseInt(dDay.replace("D-", "")) <= 3;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    toast.success(isLiked ? "찜 목록에서 삭제되었습니다" : "찜 목록에 추가되었습니다");
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: `${academy?.name || "학원"} - ${title}`,
          url: window.location.origin + `/seminar/${id}`,
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin + `/seminar/${id}`);
        toast.success("링크가 복사되었습니다");
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${prefix}/seminar/${id}`);
  };

  // Generate tags
  const tags: string[] = [];
  if (targetGrade) tags.push(`#${targetGrade}`);
  if (subject) tags.push(`#${subject}`);

  return (
    <article
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-card hover:shadow-soft transition-all duration-300 cursor-pointer animate-fade-up"
      onClick={() => navigate(`${prefix}/seminar/${id}`)}
    >
      {/* Hero Image with Badge */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/30 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-10 h-10 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">설명회 포스터</p>
            </div>
          </div>
        )}
        
        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge
            className={`${
              status === "recruiting"
                ? isUrgent
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            } px-3 py-1 text-xs font-semibold shadow-lg`}
          >
            {status === "recruiting" ? (isUrgent ? "마감임박" : "모집중") : "마감"}
          </Badge>
        </div>

        {/* D-Day Badge */}
        {dDay && (
          <div className="absolute top-3 right-3">
            <Badge
              className={`${
                dDay === "D-Day" || isUrgent
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-card/90 text-foreground"
              } px-3 py-1 text-xs font-bold shadow-lg backdrop-blur-sm`}
            >
              {dDay}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Academy Info */}
        {academy && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {academy.profile_image ? (
                <img
                  src={academy.profile_image}
                  alt={academy.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-4 h-4 text-primary" />
              )}
            </div>
            <span className="text-sm text-muted-foreground font-medium truncate">
              {academy.name}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-foreground text-lg leading-snug line-clamp-2 mb-3">
          {title}
        </h3>

        {/* Date & Location */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <span>{formatDate(date)}</span>
            <Clock className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
            <span>{formatTime(date)}</span>
          </div>
          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-secondary/60 text-secondary-foreground text-xs font-medium rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 ${isLiked ? "text-destructive" : "text-muted-foreground"}`}
            onClick={handleLike}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            <span className="text-xs">찜</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4" />
            <span className="text-xs">공유</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="ml-auto gap-1"
            onClick={handleDetail}
          >
            상세보기
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </article>
  );
};

export default SeminarFeedCard;
