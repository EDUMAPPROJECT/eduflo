import { useState, useEffect, useRef } from "react";
import { Heart, ChevronRight, ChevronLeft, Bell, Calendar, PartyPopper, MoreVertical, GraduationCap, Megaphone, MessageCircle, Send, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { fetchPostComments, toggleCommentLike, insertReplyComment, type PostCommentWithProfile } from "@/lib/postComments";

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

const commentReportReasons = [
  "욕설 및 비하 표현",
  "광고 및 스팸",
  "허위 정보 유포",
  "개인정보 노출",
  "기타",
] as const;

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
  const [commentSortOrder, setCommentSortOrder] = useState<'latest' | 'popular'>('latest');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editingSubmitting, setEditingSubmitting] = useState(false);
  const [commentDeleteDialogOpen, setCommentDeleteDialogOpen] = useState(false);
  const [commentDeleteId, setCommentDeleteId] = useState<string | null>(null);
  const [commentDeleting, setCommentDeleting] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTargetComment, setReportTargetComment] = useState<PostCommentWithProfile | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState<(typeof commentReportReasons)[number]>("욕설 및 비하 표현");
  const [customReportReason, setCustomReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blockTargetComment, setBlockTargetComment] = useState<PostCommentWithProfile | null>(null);
  const [blockSubmitting, setBlockSubmitting] = useState(false);
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

      // parent/student은 항상 댓글 작성 가능, 학원 계정은 "해당 학원 글"에 한해 멤버면 가능
      let nextCanComment = roleData?.role === "parent" || roleData?.role === "student";
      const roleLabel = roleData?.role === "parent" ? "학부모" : roleData?.role === "student" ? "학생" : roleData?.role === "admin" ? "학원" : null;
      setCurrentUserRoleLabel(roleLabel);
      setCurrentUserName(profileData?.user_name?.trim() || "익명");
      setCurrentUserImageUrl(profileData?.image_url || null);

      // Check if user is the author (for super admin posts)
      if (post.author_id === session.user.id) {
        setIsOwner(true);
        setCanComment(nextCanComment);
        return;
      }

      // Academy post: allow manage actions (edit/delete) for members with manage_posts
      // and allow commenting for approved academy members (admin role only).
      if (post.academy_id) {
        const { data: member } = await supabase
          .from("academy_members")
          .select("role, status, permissions")
          .eq("academy_id", post.academy_id)
          .eq("user_id", session.user.id)
          .eq("status", "approved")
          .maybeSingle();

        const perms = (member as any)?.permissions as any;
        const canManagePosts = !!member && (member.role === "owner" || perms?.manage_posts === true);
        if (canManagePosts) {
          setIsOwner(true);
        }

        if (!nextCanComment && roleData?.role === "admin") {
          nextCanComment = !!member;
        }
      }

      setCanComment(nextCanComment);
    };

    loadViewerState();
  }, [post?.id, post?.author_id, post?.academy_id]);

  useEffect(() => {
    const loadBlockedUsers = async () => {
      if (!currentUserId) {
        setBlockedUserIds(new Set());
        return;
      }

      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_user_id")
        .eq("blocker_id", currentUserId);

      if (error) {
        console.error("Error fetching blocked users:", error);
        return;
      }

      setBlockedUserIds(new Set((data || []).map((row) => row.blocked_user_id)));
    };

    loadBlockedUsers();
  }, [currentUserId]);

  useEffect(() => {
    const loadComments = async () => {
      if (!post) return;

      setCommentsLoading(true);
      try {
        const nextComments = await fetchPostComments(post.id, currentUserId);
        const visibleComments = nextComments.filter((comment) => !blockedUserIds.has(comment.user_id));
        setComments(visibleComments);
        onCommentCountChange?.(post.id, visibleComments.length);
      } catch (error) {
        console.error("Error fetching comments:", error);
        toast.error("댓글을 불러오지 못했습니다");
      } finally {
        setCommentsLoading(false);
      }
    };

    loadComments();
  }, [post?.id, currentUserId, blockedUserIds]);

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
      onClose?.();
      onDelete?.(post.id);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("게시글 삭제에 실패했습니다");
    } finally {
      setDeleting(false);
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
    onClose?.();
    onAcademyClick(post.academy.id);
  };

  const handleSeminarClick = () => {
    if (post.seminar_id && onSeminarClick) {
      onClose?.();
      onSeminarClick(post.seminar_id);
    }
  };

  const handleCommentButtonClick = () => {
    commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      commentInputRef.current?.focus();
    }, 250);
  };

  const handleCommentLikeToggle = async (comment: PostCommentWithProfile) => {
    if (!currentUserId) return;
    const isLiked = comment.is_liked ?? false;
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? { ...c, is_liked: !isLiked, like_count: c.like_count + (isLiked ? -1 : 1) }
          : c
      )
    );
    try {
      const result = await toggleCommentLike(comment.id, currentUserId, isLiked);
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, like_count: result.like_count, is_liked: result.is_liked } : c))
      );
    } catch (error) {
      console.error("Error toggling comment like:", error);
      toast.error("좋아요 처리에 실패했습니다");
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, is_liked: isLiked, like_count: comment.like_count } : c
        )
      );
    }
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
        like_count: 0,
        is_liked: false,
        parent_comment_id: null,
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

  const handleReplySubmit = async (parentCommentId: string) => {
    if (!post || !currentUserId || !replyDraft.trim() || !canComment) return;
    setSubmittingReply(true);
    try {
      const newReply = await insertReplyComment(
        post.id,
        parentCommentId,
        currentUserId,
        replyDraft.trim(),
        {
          image_url: currentUserImageUrl,
          user_name: currentUserName,
          role_label: currentUserRoleLabel,
        }
      );
      setComments((prev) => {
        const next = [...prev, newReply];
        onCommentCountChange?.(post.id, next.length);
        return next;
      });
      setReplyDraft("");
      setReplyingToCommentId(null);
      toast.success("답글이 등록되었습니다");
    } catch (error) {
      console.error("Error creating reply:", error);
      toast.error("답글 등록에 실패했습니다");
    } finally {
      setSubmittingReply(false);
    }
  };

  const reloadComments = async () => {
    if (!post) return;
    try {
      const nextComments = await fetchPostComments(post.id, currentUserId);
      const visibleComments = nextComments.filter((comment) => !blockedUserIds.has(comment.user_id));
      setComments(visibleComments);
      onCommentCountChange?.(post.id, visibleComments.length);
    } catch (error) {
      console.error("Error reloading comments:", error);
      toast.error("댓글을 불러오지 못했습니다");
    }
  };

  const handleStartEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditDraft(currentContent);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditDraft("");
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!post || !currentUserId) return;

    const trimmed = editDraft.trim();
    if (!trimmed) return;

    setEditingSubmitting(true);
    try {
      const { error } = await supabase
        .from("post_comments")
        .update({ content: trimmed })
        .eq("id", commentId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: trimmed } : c)));
      toast.success("댓글이 수정되었습니다");
      setEditingCommentId(null);
      setEditDraft("");
    } catch (error) {
      console.error("Error editing comment:", error);
      toast.error("댓글 수정에 실패했습니다");
    } finally {
      setEditingSubmitting(false);
    }
  };

  const handleRequestDeleteComment = (commentId: string) => {
    setCommentDeleteId(commentId);
    setCommentDeleteDialogOpen(true);
  };

  const handleConfirmDeleteComment = async () => {
    if (!post || !currentUserId || !commentDeleteId) return;

    const targetId = commentDeleteId;

    setCommentDeleting(true);
    try {
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", targetId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      // DB 삭제 정책(예: RLS/캐스케이드)에 따라 실제로 사라진 댓글이 달라질 수 있어
      // 서버 상태를 다시 불러와 UI를 확정합니다.
      await reloadComments();

      if (editingCommentId === targetId) {
        setEditingCommentId(null);
        setEditDraft("");
      }

      toast.success("댓글이 삭제되었습니다");
      setCommentDeleteDialogOpen(false);
      setCommentDeleteId(null);
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("댓글 삭제에 실패했습니다");
    } finally {
      setCommentDeleting(false);
    }
  };

  const handleOpenReportDialog = (comment: PostCommentWithProfile) => {
    setReportTargetComment(comment);
    setSelectedReportReason("욕설 및 비하 표현");
    setCustomReportReason("");
    setReportDialogOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!currentUserId || !reportTargetComment) return;

    const isEtc = selectedReportReason === "기타";
    const detail = isEtc ? customReportReason.trim() : "";
    if (isEtc && !detail) {
      toast.error("기타 사유를 입력해주세요");
      return;
    }

    setReportSubmitting(true);
    try {
      const { error } = await supabase
        .from("comment_reports")
        .insert({
          reporter_id: currentUserId,
          comment_id: reportTargetComment.id,
          reason_type: selectedReportReason,
          reason_detail: detail || null,
        });

      if (error) throw error;

      toast.success("신고가 접수되었습니다");
      setReportDialogOpen(false);
      setReportTargetComment(null);
      setCustomReportReason("");
    } catch (error) {
      console.error("Error reporting comment:", error);
      toast.error("신고 접수에 실패했습니다");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleOpenBlockConfirm = (comment: PostCommentWithProfile) => {
    setBlockTargetComment(comment);
    setBlockConfirmOpen(true);
  };

  const handleConfirmBlockUser = async () => {
    if (!currentUserId || !blockTargetComment) return;

    setBlockSubmitting(true);
    try {
      const targetUserId = blockTargetComment.user_id;
      const { error } = await supabase
        .from("user_blocks")
        .upsert(
          { blocker_id: currentUserId, blocked_user_id: targetUserId },
          { onConflict: "blocker_id,blocked_user_id", ignoreDuplicates: true }
        );

      if (error) throw error;

      setBlockedUserIds((prev) => {
        const next = new Set(prev);
        next.add(targetUserId);
        return next;
      });
      await reloadComments();

      toast.success("해당 사용자를 차단했습니다");
      setBlockConfirmOpen(false);
      setBlockTargetComment(null);
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("사용자 차단에 실패했습니다");
    } finally {
      setBlockSubmitting(false);
    }
  };

  const roots = comments.filter((c) => !c.parent_comment_id);
  const repliesByParent = comments
    .filter((c) => c.parent_comment_id)
    .reduce<Record<string, PostCommentWithProfile[]>>((acc, c) => {
      const pid = c.parent_comment_id!;
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(c);
      return acc;
    }, {});

  const renderCommentBlock = (comment: PostCommentWithProfile, isReply: boolean) => {
    const commenterName = comment.profile?.user_name?.trim() || "익명";
    const commenterInitial = commenterName.charAt(0);
    const commenterImageUrl = comment.profile?.image_url;
    const roleLabel = comment.profile?.role_label || "회원";
    const isAcademyRole = roleLabel === "학원";
    const replies = repliesByParent[comment.id] ?? [];
    const isReplyingThis = replyingToCommentId === comment.id;
    const isAuthor = comment.user_id === currentUserId;
    const showActions = canComment;

    return (
      <div key={comment.id} className={cn("py-3", isReply && "pl-8 border-l-2 border-muted/60")}>
        <div className={cn("flex items-center gap-2 mb-0.5", isReply && "pl-3")}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
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
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="댓글 옵션 열기"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto min-w-[3.3rem]">
                {isAuthor ? (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditComment(comment.id, comment.content);
                      }}
                    >
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestDeleteComment(comment.id);
                      }}
                    >
                      삭제
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenReportDialog(comment);
                      }}
                    >
                      신고
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBlockConfirm(comment);
                      }}
                    >
                      차단
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {editingCommentId === comment.id ? (
          <div className={cn(isReply ? "pl-14" : "pl-11", "mt-1")}>
            <Textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={2}
              maxLength={500}
              className="text-sm resize-none"
              disabled={editingSubmitting}
            />
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={() => handleSaveEditComment(comment.id)}
                disabled={editingSubmitting || !editDraft.trim()}
                className="gap-1"
              >
                저장
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEditComment}
                disabled={editingSubmitting}
              >
                취소
              </Button>
            </div>
          </div>
        ) : (
          <p className={cn("text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed", isReply ? "pl-14" : "pl-11")}>
            {comment.content}
          </p>
        )}
        <div className={cn("flex items-center gap-3 pl-11 mt-2.5", isReply && "pl-14")}>
          <button
            type="button"
            onClick={() => handleCommentLikeToggle(comment)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            aria-label={comment.is_liked ? "좋아요 취소" : "좋아요"}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-all",
                comment.is_liked ? "fill-destructive text-destructive" : ""
              )}
            />
            {comment.like_count > 0 && (
              <span className={cn(comment.is_liked && "text-destructive")}>
                {comment.like_count}
              </span>
            )}
          </button>
          {!isReply && canComment && editingCommentId !== comment.id && (
            <button
              type="button"
              onClick={() => setReplyingToCommentId(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              답글
            </button>
          )}
        </div>
        {!isReply && isReplyingThis && (
          <div className="mt-5 pl-11 flex flex-col gap-2">
            <Textarea
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="답글을 입력하세요..."
              rows={2}
              maxLength={500}
              className="text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleReplySubmit(comment.id)}
                disabled={submittingReply || !replyDraft.trim()}
                className="gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                등록
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setReplyingToCommentId(null); setReplyDraft(""); }}
              >
                취소
              </Button>
            </div>
          </div>
        )}
        {replies.length > 0 && (
          <div className="mt-2 space-y-0">
            {replies
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((r) => renderCommentBlock(r, true))}
          </div>
        )}
      </div>
    );
  };

  return (
      <div className="min-h-screen h-screen overflow-y-auto bg-background">
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
        <div className="pt-14 min-h-full bg-background">
          <div className="max-w-md mx-auto w-full min-h-[calc(100vh-3.5rem)] bg-white pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))]">
            {/* 상단 작성자: 가로 패딩은 제목/내용과 동일 px-4 */}
            <div className="px-4 py-4">
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
            <div ref={commentsSectionRef} className="w-full border-t-8 border-slate-100 bg-white px-4 pt-4">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">댓글 {comments.length}</h4>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCommentSortOrder('latest')}
                      className={cn(
                        "px-2 py-1 text-xs rounded-md transition-colors",
                        commentSortOrder === 'latest'
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      최신순
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentSortOrder('popular')}
                      className={cn(
                        "px-2 py-1 text-xs rounded-md transition-colors",
                        commentSortOrder === 'popular'
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      추천순
                    </button>
                  </div>
                </div>
                {commentsLoading ? (
                  <p className="text-sm text-muted-foreground">댓글을 불러오는 중...</p>
                ) : comments.length === 0 ? null : (
                  <div className="space-y-3">
                    {[...roots]
                      .sort((a, b) => {
                        if (commentSortOrder === 'latest') {
                          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        }
                        return (b.like_count ?? 0) - (a.like_count ?? 0);
                      })
                      .map((root) => renderCommentBlock(root, false))}
                  </div>
                )}
              </div>
            </div>
          </div>
        {/* 하단 고정: 액션 바(좋아요·댓글 수) + 댓글 입력창 - 가로 패딩은 헤더(뒤로가기·글 상세)와 동일 */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-10 pb-[env(safe-area-inset-bottom,0px)]">
          <div className="max-w-md mx-auto px-4">
            {/* 액션 바: 좋아요, 댓글 수만 */}
            <div className="py-3 flex items-center gap-4">
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
                <span className={cn("text-foreground", post.is_liked && "text-destructive")}>
                  {post.like_count > 0 ? post.like_count : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={handleCommentButtonClick}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-foreground">{comments.length}</span>
              </button>
            </div>
            {/* 댓글 입력창 (작성 불가 시에도 UI는 노출하되 disabled) */}
            <div className="flex items-center gap-2 pb-3">
              <div
                className={cn(
                  "flex-1 flex items-center min-h-11 rounded-full border pl-4 pr-2",
                  canComment ? "bg-muted border-input" : "bg-muted/40 border-border"
                )}
              >
                <Textarea
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(e) => {
                    if (!canComment) return;
                    setCommentText(e.target.value);
                  }}
                  placeholder={canComment ? "댓글을 입력하세요..." : "댓글 작성은 학부모/학생 계정에서 가능합니다."}
                  rows={1}
                  maxLength={500}
                  disabled={!canComment}
                  className="flex-1 min-h-0 border-0 bg-transparent px-0 py-3 text-sm leading-5 resize-none focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0 disabled:opacity-100"
                />
                <Button
                  size="icon"
                  className={cn(
                    "rounded-full w-9 h-9 shrink-0",
                    canComment
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                  onClick={handleCommentSubmit}
                  disabled={!canComment || submittingComment || !commentText.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
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

        <AlertDialog open={commentDeleteDialogOpen} onOpenChange={setCommentDeleteDialogOpen}>
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 댓글을 삭제하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={commentDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteComment}
                disabled={commentDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {commentDeleting ? "삭제 중..." : "삭제"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-md w-[calc(100%-1rem)] p-0 gap-0 top-auto bottom-0 translate-y-0 sm:translate-y-0 rounded-t-2xl rounded-b-none sm:rounded-t-2xl sm:rounded-b-none border-0 [&>button]:hidden">
            <div className="h-1.5 w-12 rounded-full bg-muted mx-auto mt-3" />
            <div className="px-6 pb-6 pt-4">
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-bold">댓글 신고</DialogTitle>
                <DialogDescription>신고 사유를 선택해주세요</DialogDescription>
              </DialogHeader>

              <div className="mt-6 border-t border-border">
                {commentReportReasons.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-3 py-4 border-b border-border cursor-pointer"
                  >
                    <input
                      type="radio"
                      className="sr-only peer"
                      name="comment-report-reason"
                      value={reason}
                      checked={selectedReportReason === reason}
                      onChange={() => setSelectedReportReason(reason)}
                    />
                    <span className="h-5 w-5 rounded-full border border-muted-foreground/30 flex items-center justify-center transition-colors peer-checked:bg-primary peer-checked:border-white peer-checked:[&>span]:opacity-100">
                      <span className="h-2 w-2 rounded-full bg-white opacity-0 transition-opacity" />
                    </span>
                    <span className="text-sm text-foreground">{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReportReason === "기타" && (
                <Textarea
                  className="mt-4 min-h-28 text-sm resize-none"
                  placeholder="신고 사유를 입력해주세요"
                  maxLength={300}
                  value={customReportReason}
                  onChange={(e) => setCustomReportReason(e.target.value)}
                />
              )}

              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-full"
                  onClick={() => setReportDialogOpen(false)}
                  disabled={reportSubmitting}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-12 rounded-full"
                  onClick={handleSubmitReport}
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? "신고 중..." : "신고하기"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>사용자 차단</AlertDialogTitle>
              <AlertDialogDescription>
                {(blockTargetComment?.profile?.user_name?.trim() || "해당 사용자")}님을 차단하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={blockSubmitting}>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmBlockUser} disabled={blockSubmitting}>
                {blockSubmitting ? "차단 중..." : "차단"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
};

export default FeedPostDetailSheet;
