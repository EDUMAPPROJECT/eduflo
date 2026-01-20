import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Share2, ChevronRight, Bell, Calendar, PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ImageViewer from "@/components/ImageViewer";
import { useRoutePrefix } from "@/hooks/useRoutePrefix";

interface FeedPost {
  id: string;
  academy_id: string;
  type: 'notice' | 'seminar' | 'event';
  title: string;
  body: string | null;
  image_url: string | null;
  like_count: number;
  created_at: string;
  seminar_id?: string | null;
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
  onCardClick?: () => void;
}

const typeConfig = {
  notice: { label: '공지', icon: Bell, color: 'bg-blue-500 text-white' },
  seminar: { label: '설명회', icon: Calendar, color: 'bg-orange-500 text-white' },
  event: { label: '이벤트', icon: PartyPopper, color: 'bg-purple-500 text-white' },
};

const FeedPostCard = ({ post, onLikeToggle, onAcademyClick, onCardClick }: FeedPostCardProps) => {
  const navigate = useNavigate();
  const prefix = useRoutePrefix();
  const config = typeConfig[post.type];
  const TypeIcon = config.icon;
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handleSeminarClick = () => {
    if (post.seminar_id) {
      navigate(`${prefix}/seminar/${post.seminar_id}`);
    }
  };

  // Parse image URLs - support both single URL string and JSON array
  const getImageUrls = (): string[] => {
    if (!post.image_url) return [];
    try {
      // Try parsing as JSON array first
      const parsed = JSON.parse(post.image_url);
      return Array.isArray(parsed) ? parsed : [post.image_url];
    } catch {
      // If not JSON, treat as single URL
      return [post.image_url];
    }
  };

  const imageUrls = getImageUrls();

  const handleImageClick = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

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
      <div 
        className="px-4 pb-3 cursor-pointer"
        onClick={onCardClick}
      >
        <div className="flex items-center gap-2 mb-2">
          <Badge className={cn("text-xs px-2 py-0.5 gap-1", config.color)}>
            <TypeIcon className="w-3 h-3" />
            {config.label}
          </Badge>
          {/* Seminar direct link button */}
          {post.type === 'seminar' && post.seminar_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSeminarClick();
              }}
              className="h-6 text-xs gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              신청하기
              <ChevronRight className="w-3 h-3" />
            </Button>
          )}
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

      {/* Images Gallery */}
      {imageUrls.length > 0 && (
        <div className="px-4 pb-3">
          {imageUrls.length === 1 ? (
            <img
              src={imageUrls[0]}
              alt={post.title}
              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick(0)}
            />
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {imageUrls.slice(0, 4).map((url, index) => (
                <div 
                  key={index} 
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleImageClick(index)}
                >
                  <img
                    src={url}
                    alt={`${post.title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {index === 3 && imageUrls.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold">+{imageUrls.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image Viewer */}
      <ImageViewer
        images={imageUrls}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />

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

        <Button
          variant="outline"
          size="sm"
          onClick={onCardClick}
          className="gap-1"
        >
          자세히 보기
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

export default FeedPostCard;
