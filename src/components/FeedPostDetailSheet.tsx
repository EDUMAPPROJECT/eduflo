import { useState } from "react";
import { Heart, Share2, ChevronRight, ChevronLeft, Bell, Calendar, PartyPopper, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ImageViewer from "@/components/ImageViewer";
import useEmblaCarousel from "embla-carousel-react";

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

interface FeedPostDetailSheetProps {
  post: FeedPost | null;
  open: boolean;
  onClose: () => void;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
  onAcademyClick: (academyId: string) => void;
  onSeminarClick?: (seminarId: string) => void;
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
  onAcademyClick,
  onSeminarClick
}: FeedPostDetailSheetProps) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentSlide, setCurrentSlide] = useState(0);

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

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  // Update current slide on scroll
  emblaApi?.on('select', () => {
    setCurrentSlide(emblaApi.selectedScrollSnap());
  });

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

  const handleSeminarClick = () => {
    if (post.seminar_id && onSeminarClick) {
      onClose();
      onSeminarClick(post.seminar_id);
    }
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

              {/* Images Carousel */}
              {imageUrls.length > 0 && (
                <div className="mb-4 relative">
                  <div className="overflow-hidden rounded-lg" ref={emblaRef}>
                    <div className="flex">
                      {imageUrls.map((url, index) => (
                        <div
                          key={index}
                          className="flex-[0_0_100%] min-w-0"
                        >
                          <img
                            src={url}
                            alt={`${post.title} ${index + 1}`}
                            className="w-full aspect-video object-cover cursor-pointer"
                            onClick={() => handleImageClick(index)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Navigation arrows */}
                  {imageUrls.length > 1 && (
                    <>
                      <button
                        onClick={scrollPrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={scrollNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      
                      {/* Dots indicator */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {imageUrls.map((_, index) => (
                          <div
                            key={index}
                            className={cn(
                              "w-2 h-2 rounded-full transition-colors",
                              currentSlide === index ? "bg-white" : "bg-white/50"
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Seminar CTA Button */}
              {post.type === 'seminar' && onSeminarClick && (
                post.seminar_id ? (
                  <Button
                    variant="default"
                    className="w-full mb-4 gap-2"
                    onClick={handleSeminarClick}
                  >
                    <Calendar className="w-4 h-4" />
                    설명회 신청하기
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full mb-4 gap-2"
                    onClick={handleAcademyClick}
                  >
                    <Calendar className="w-4 h-4" />
                    학원 설명회 보기
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )
              )}

              {/* Event CTA Button */}
              {post.type === 'event' && (
                <Button
                  variant="outline"
                  className="w-full mb-4 gap-2 border-purple-500/50 text-purple-600 hover:bg-purple-50"
                  onClick={handleAcademyClick}
                >
                  <PartyPopper className="w-4 h-4" />
                  학원 이벤트 보기
                  <ChevronRight className="w-4 h-4" />
                </Button>
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
