import { Heart, Share2, ChevronRight, Bell, Calendar, PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FeedPost {
  id: string;
  academy_id: string;
  type: 'notice' | 'seminar' | 'event';
  title: string;
  body: string | null;
  image_url: string | null;
  like_count: number;
  created_at: string;
  academy: {
    id: string;
    name: string;
    profile_image: string | null;
  };
  is_liked?: boolean;
}

interface FeedPostCardProps {
  post: FeedPost;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
  onAcademyClick: (academyId: string) => void;
}

const typeConfig = {
  notice: { label: '공지', icon: Bell, color: 'bg-blue-500 text-white' },
  seminar: { label: '설명회', icon: Calendar, color: 'bg-orange-500 text-white' },
  event: { label: '이벤트', icon: PartyPopper, color: 'bg-purple-500 text-white' },
};

const FeedPostCard = ({ post, onLikeToggle, onAcademyClick }: FeedPostCardProps) => {
  const config = typeConfig[post.type];
  const TypeIcon = config.icon;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: `${post.academy.name}의 새 소식: ${post.title}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    }
  };

  return (
    <Card className="overflow-hidden border-border">
      {/* Header */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={() => onAcademyClick(post.academy.id)}
      >
        <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden shrink-0">
          {post.academy.profile_image ? (
            <img
              src={post.academy.profile_image}
              alt={post.academy.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary font-bold">
              {post.academy.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">
              {post.academy.name}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
              학원작성
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge className={cn("text-xs px-2 py-0.5 gap-1", config.color)}>
            <TypeIcon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>
        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
          {post.title}
        </h3>
        {post.body && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.body}
          </p>
        )}
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="px-4 pb-3">
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onLikeToggle(post.id, post.is_liked || false)}
            className="flex items-center gap-1.5 text-sm transition-colors"
          >
            <Heart
              className={cn(
                "w-5 h-5 transition-all",
                post.is_liked
                  ? "fill-destructive text-destructive"
                  : "text-muted-foreground hover:text-destructive"
              )}
            />
            <span className={cn(
              post.is_liked ? "text-destructive" : "text-muted-foreground"
            )}>
              {post.like_count > 0 && post.like_count}
            </span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {(post.type === 'seminar' || post.type === 'event') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAcademyClick(post.academy.id)}
            className="gap-1"
          >
            자세히 보기
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default FeedPostCard;
