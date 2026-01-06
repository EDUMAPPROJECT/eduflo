import { useState } from "react";
import { Heart, Share2, ChevronRight, Bell, Calendar, PartyPopper, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ImageViewer from "@/components/ImageViewer";

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

interface FeedPostDetailSheetProps {
  post: FeedPost | null;
  open: boolean;
  onClose: () => void;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
  onAcademyClick: (academyId: string) => void;
}

const typeConfig = {
  notice: { label: '공지', icon: Bell, color: 'bg-blue-500 text-white' },
  seminar: { label: '설명회', icon: Calendar, color: 'bg-orange-500 text-white' },
  event: { label: '이벤트', icon: PartyPopper, color: 'bg-purple-500 text-white' },
};

const FeedPostDetailSheet = ({ 
  post, 
  open, 
  onClose, 
  onLikeToggle, 
  onAcademyClick 
}: FeedPostDetailSheetProps) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  if (!post) return null;

  const config = typeConfig[post.type];
  const TypeIcon = config.icon;

  // Parse image URLs - support both single URL string and JSON array
  const getImageUrls = (): string[] => {
    if (!post.image_url) return [];
    try {
      const parsed = JSON.parse(post.image_url);
      return Array.isArray(parsed) ? parsed : [post.image_url];
    } catch {
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

  const handleAcademyClick = () => {
    onClose();
    onAcademyClick(post.academy.id);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border z-10">
            <SheetHeader className="p-4">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={handleAcademyClick}
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
                  <div>
                    <p className="text-sm font-medium text-foreground">{post.academy.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(post.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </SheetHeader>
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-[calc(85vh-80px)] pb-20">
            <div className="p-4">
              {/* Type Badge & Title */}
              <div className="flex items-center gap-2 mb-3">
                <Badge className={cn("text-xs px-2 py-0.5 gap-1", config.color)}>
                  <TypeIcon className="w-3 h-3" />
                  {config.label}
                </Badge>
              </div>
              <SheetTitle className="text-left text-lg font-bold mb-4">
                {post.title}
              </SheetTitle>

              {/* Images Gallery */}
              {imageUrls.length > 0 && (
                <div className="mb-4">
                  {imageUrls.length === 1 ? (
                    <img
                      src={imageUrls[0]}
                      alt={post.title}
                      className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(0)}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {imageUrls.map((url, index) => (
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Body Content */}
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {post.body || "내용이 없습니다."}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
            <div className="flex items-center justify-between max-w-lg mx-auto">
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
                variant="default"
                size="sm"
                onClick={handleAcademyClick}
                className="gap-1"
              >
                학원 프로필 보기
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Image Viewer */}
      <ImageViewer
        images={imageUrls}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
};

export default FeedPostDetailSheet;
