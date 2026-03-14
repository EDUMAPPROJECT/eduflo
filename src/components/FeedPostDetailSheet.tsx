import { useState, useEffect, useRef } from "react";
import { Heart, Share2, ChevronRight, ChevronLeft, Bell, Calendar, PartyPopper, MoreVertical, GraduationCap, Megaphone, MessageCircle, Send, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ImageViewer from "@/components/ImageViewer";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchPostComments, type PostCommentWithProfile } from "@/lib/postComments";

interface FeedPost {
  id: string;
  academy_id: string | null;
  type: 'notice' | 'admission' | 'seminar' | 'event' | 'academy-admission' | 'life-parenting' | 'free-talk';
  title: string;
  body: string | null;
  image_url: string | null;
  like_count: number;
  created_at: string;
  seminar_id?: string | null;
  author_id?: string | null;
  academy?: {
    id: string;
    name: string;
    profile_image: string | null;
  } | null;
  author?: {
    user_name: string | null;
  } | null;
  author_role_label?: string | null;
  is_liked?: boolean;
  comment_count?: number;
}

interface FeedPostDetailSheetProps {
  post: FeedPost | null;
  open?: boolean;
  onClose?: () => void;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
  onAcademyClick: (academyId: string) => void;
  onSeminarClick?: (seminarId: string) => void;
  onDelete?: (postId: string) => void;
  onCommentCountChange?: (postId: string, commentCount: number) => void;
  onBack: () => void;
}

const typeConfig = {
  notice: { label: '학원 소식', icon: Megaphone, color: 'bg-blue-500 text-white' },
  admission: { label: '입시 정보', icon: GraduationCap, color: 'bg-green-600 text-white' },
  seminar: { label: '설명회', icon: Calendar, color: 'bg-orange-500 text-white' },
  event: { label: '이벤트', icon: PartyPopper, color: 'bg-purple-500 text-white' },
  'academy-admission': { label: '학원·입시정보', icon: GraduationCap, color: 'bg-green-600 text-white' },
  'life-parenting': { label: '생활·육아', icon: Bell, color: 'bg-amber-500 text-white' },
  'free-talk': { label: '자유수다', icon: MessageCircle, color: 'bg-slate-600 text-white' },
};

const formatCommentTimestamp = (createdAt: string) => {
  const createdAtDate = new Date(createdAt);
  const diffMs = Date.now() - createdAtDate.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  return format(createdAtDate, "M월 d일 HH:mm", { locale: ko });
};

const FeedPostDetailSheet = ({ 
  post, 
  open, 
  onClose, 
  onLikeToggle, 
  onAcademyClick,
  onSeminarClick,
  onDelete,
  onCommentCountChange,
  onBack,
}: FeedPostDetailSheetProps) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("익명");
  const [currentUserImageUrl, setCurrentUserImageUrl] = useState<string | null>(null);
  const [currentUserRoleLabel, setCurrentUserRoleLabel] = useState<string | null>(null);
  const [comments, setComments] = useState<PostCommentWithProfile[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const loadViewerState = async () => {
      if (!post) return;

      setIsOwner(false);
      setCanComment(false);
      setCurrentUserId(null);
      setCurrentUserName("익명");
      setCurrentUserImageUrl(null);
      setCurrentUserRoleLabel(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setCurrentUserId(session.user.id);

      const [{ data: roleData }, { data: profileData }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("user_name, image_url")
          .eq("id", session.user.id)
          .maybeSingle(),
      ]);

      setCanComment(roleData?.role === "parent" || roleData?.role === "student");
      const roleLabel = roleData?.role === "parent" ? "학부모" : roleData?.role === "student" ? "학생" : roleData?.role === "admin" ? "학원" : null;
      setCurrentUserRoleLabel(roleLabel);
      setCurrentUserName(profileData?.user_name?.trim() || "익명");
      setCurrentUserImageUrl(profileData?.image_url || null);

      // Check if user is the author (for super admin posts)
      if (post.author_id === session.user.id) {
        setIsOwner(true);
        return;
      }

      // Check if user is academy owner
      if (post.academy_id) {
        const { data: academy } = await supabase
          .from("academies")
          .select("id")
          .eq("id", post.academy_id)
          .eq("owner_id", session.user.id)
          .maybeSingle();
        setIsOwner(!!academy);
      }
    };

    loadViewerState();
  }, [post?.id, post?.author_id, post?.academy_id]);

  useEffect(() => {
    const loadComments = async () => {
      if (!post) return;

      setCommentsLoading(true);
      try {
        const nextComments = await fetchPostComments(post.id);
        setComments(nextComments);
        onCommentCountChange?.(post.id, nextComments.length);
      } catch (error) {
        console.error("Error fetching comments:", error);
        toast.error("댓글을 불러오지 못했습니다");
      } finally {
        setCommentsLoading(false);
      }
    };

    loadComments();
  }, [post?.id]);

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

  const handleDelete = async () => {
    if (!post) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("feed_posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      toast.success("게시글이 삭제되었습니다");
      setDeleteDialogOpen(false);
      onClose();
      onDelete?.(post.id);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("게시글 삭제에 실패했습니다");
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: `${post.academy?.name || post.author?.user_name || "운영자"}의 새 소식: ${post.title}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    }
  };

  const isAcademyPost = !!post.academy_id && !!post.academy;
  const displayName = isAcademyPost
    ? (post.academy?.name || '학원')
    : (post.author?.user_name || '운영자');
  const displayInitial = displayName.charAt(0);
  const profileImage = isAcademyPost ? post.academy?.profile_image : null;
  const authorLabel = isAcademyPost ? '학원' : (post.author_role_label || '운영자');

  const handleAcademyClick = () => {
    if (!isAcademyPost || !post.academy) return;
    onClose();
    onAcademyClick(post.academy.id);
  };

  const handleSeminarClick = () => {
    if (post.seminar_id && onSeminarClick) {
      onClose();
      onSeminarClick(post.seminar_id);
    }
  };

  const handleCommentButtonClick = () => {
    commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      commentInputRef.current?.focus();
    }, 250);
  };

  const handleCommentSubmit = async () => {
    if (!post || !currentUserId || !commentText.trim() || !canComment) return;

    setSubmittingComment(true);
    try {
      const trimmedContent = commentText.trim();
      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          content: trimmedContent,
        })
        .select("id, post_id, user_id, content, created_at")
        .single();

      if (error) throw error;

      const nextComment: PostCommentWithProfile = {
        ...data,
        profile: {
          image_url: currentUserImageUrl,
          user_name: currentUserName,
          role_label: currentUserRoleLabel,
        },
      };

      setComments((prev) => {
        const nextComments = [...prev, nextComment];
        onCommentCountChange?.(post.id, nextComments.length);
        return nextComments;
      });
      setCommentText("");
      toast.success("댓글이 등록되었습니다");
    } catch (error) {
      console.error("Error creating comment:", error);
      toast.error("댓글 등록에 실패했습니다");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
      <div className="min-h-screen bg-white">
        <div className="fixed top-0 left-0 right-0 z-20 bg-card border-b">
          <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={onBack} aria-label="뒤로가기">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">글 상세</span>
            {isOwner ? (
              <Button variant="ghost" size="icon" onClick={() => setDeleteDialogOpen(true)}>
                <MoreVertical className="w-5 h-5" />
              </Button>
            ) : <div className="w-10" />}
          </div>
        </div>
        <div className="pt-14 h-[calc(100vh-3.5rem)] overflow-y-auto flex flex-col">
          <div className="max-w-md mx-auto bg-background flex-1 min-h-0 flex flex-col w-full min-h-[calc(100vh-3.5rem)] pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
          <div className="px-4 py-4 shrink-0">
            <div
              className={`flex items-center gap-3 ${isAcademyPost ? 'cursor-pointer' : ''}`}
              onClick={handleAcademyClick}
              role={isAcademyPost ? 'button' : undefined}
            >
              <div className={`w-10 h-10 rounded-full overflow-hidden shrink-0 ${isAcademyPost ? 'bg-secondary' : 'bg-primary/20'}`}>
                {profileImage ? (
                  <img src={profileImage} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                    {displayInitial}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{displayName}</p>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 shrink-0 ${isAcademyPost ? 'bg-primary/10 text-primary' : 'bg-amber-500/20 text-amber-600'}`}
                  >
                    {authorLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCommentTimestamp(post.created_at)}
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={cn("text-xs px-2 py-0.5", config.color)}>
                  {config.label}
                </Badge>
              </div>
              <h1 className="text-left text-lg font-bold mb-4">
                {post.title}
              </h1>
              {imageUrls.length > 0 && (
                <div className="mb-4 relative">
                  <div className="overflow-hidden rounded-lg" ref={emblaRef}>
                    <div className="flex">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="flex-[0_0_100%] min-w-0">
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
                  {imageUrls.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={scrollPrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={scrollNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
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
              {post.type === 'seminar' && onSeminarClick && post.seminar_id && (
                <Button variant="default" className="w-full mb-4 gap-2" onClick={handleSeminarClick}>
                  <Calendar className="w-4 h-4" />
                  설명회 신청하기
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              {post.type === 'event' && isAcademyPost && (
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
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {post.body || "내용이 없습니다."}
              </div>
            </div>
          </div>
          <div ref={commentsSectionRef} className="w-full border-t-8 border-slate-100 bg-background pt-4 px-4 flex-1 min-h-0 flex flex-col">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-foreground">댓글 {comments.length}</h4>
                </div>
                {commentsLoading ? (
                  <p className="text-sm text-muted-foreground">댓글을 불러오는 중...</p>
                ) : comments.length === 0 ? null : (
                  <div className="space-y-3">
                    {comments.map((comment) => {
                      const commenterName = comment.profile?.user_name?.trim() || "익명";
                      const commenterInitial = commenterName.charAt(0);
                      const commenterImageUrl = comment.profile?.image_url;
                      const roleLabel = comment.profile?.role_label || "회원";
                      const isAcademyRole = roleLabel === "학원";
                      return (
                        <div key={comment.id} className="py-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            {commenterImageUrl ? (
                              <img src={commenterImageUrl} alt={commenterName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/25 text-primary flex items-center justify-center shrink-0 text-base font-semibold">
                                {commenterInitial}
                              </div>
                            )}
                            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 shrink-0", isAcademyRole ? "bg-primary/10 text-primary" : "bg-amber-500/20 text-amber-600")}>
                              {roleLabel}
                            </Badge>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">{commenterName}</p>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatCommentTimestamp(comment.created_at)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed pl-11">
                            {comment.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {canComment ? (
                  <div className="mt-4">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="flex items-center h-12 rounded-full bg-muted border border-slate-300 pl-6 pr-3">
                          <Textarea
                            ref={commentInputRef}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="댓글을 입력하세요"
                            rows={1}
                            maxLength={500}
                            className="flex-1 h-12 min-h-0 border-0 bg-transparent px-0 py-3.5 text-sm leading-5 resize-none focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0"
                          />
                          <Button
                            size="icon"
                            className="ml-2 rounded-full w-9 h-9"
                            onClick={handleCommentSubmit}
                            disabled={submittingComment || !commentText.trim()}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    댓글 작성은 학부모/학생 계정에서 가능합니다.
                  </div>
                )}
              </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-10 pb-[env(safe-area-inset-bottom,0px)]">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onLikeToggle(post.id, post.is_liked || false)}
                className="flex items-center gap-1.5 text-sm transition-colors"
              >
                <Heart
                  className={cn(
                    "w-5 h-5 transition-all",
                    post.is_liked ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-destructive"
                  )}
                />
                <span className={cn(post.is_liked ? "text-destructive" : "text-muted-foreground")}>
                  {post.like_count > 0 && post.like_count}
                </span>
              </button>
              <button
                type="button"
                onClick={handleCommentButtonClick}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{comments.length}</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
            {isAcademyPost ? (
              <Button variant="default" size="sm" onClick={handleAcademyClick} className="gap-1">
                학원 프로필 보기
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
        <ImageViewer
          images={imageUrls}
          initialIndex={viewerIndex}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 게시글을 삭제하시겠습니까? 삭제된 게시글은 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
};

export default FeedPostDetailSheet;
