import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRegion } from "@/contexts/RegionContext";
import { useToast } from "@/hooks/use-toast";
import AdminBottomNavigation from "@/components/AdminBottomNavigation";
import Logo from "@/components/Logo";
import GlobalRegionSelector from "@/components/GlobalRegionSelector";
import FeedPostCard from "@/components/FeedPostCard";
import FeedPostDetailSheet from "@/components/FeedPostDetailSheet";
import CreatePostDialog from "@/components/CreatePostDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Newspaper, 
  Bell, 
  PartyPopper, 
  Calendar, 
  Bookmark, 
  Search,
  Plus,
  AlertTriangle,
  X
} from "lucide-react";

interface FeedPost {
  id: string;
  academy_id: string;
  type: 'notice' | 'seminar' | 'event';
  title: string;
  body: string | null;
  image_url: string | null;
  target_regions: string[];
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

const filterOptions = [
  { id: 'all', label: '전체', icon: null },
  { id: 'notice', label: '공지', icon: Bell },
  { id: 'seminar', label: '설명회', icon: Calendar },
  { id: 'event', label: '이벤트', icon: PartyPopper },
];

const MIGRATION_NOTICE_KEY = 'edumap_migration_notice_dismissed';

const AdminCommunityPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedRegion, selectedRegionName } = useRegion();
  
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showMigrationNotice, setShowMigrationNotice] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);

  useEffect(() => {
    // Check if migration notice was dismissed
    const dismissed = localStorage.getItem(MIGRATION_NOTICE_KEY);
    if (!dismissed) {
      setShowMigrationNotice(true);
    }
  }, []);

  const dismissMigrationNotice = () => {
    localStorage.setItem(MIGRATION_NOTICE_KEY, 'true');
    setShowMigrationNotice(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        
        const { data: academy } = await supabase
          .from("academies")
          .select("id")
          .eq("owner_id", session.user.id)
          .maybeSingle();
        
        if (academy) {
          setAcademyId(academy.id);
        }
      }
    };
    init();
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("feed_posts")
        .select(`
          *,
          academy:academies!inner(id, name, profile_image)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (activeFilter !== 'all') {
        query = query.eq("type", activeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredPosts = (data || []) as unknown as FeedPost[];

      // Check which posts the user has liked
      if (userId && filteredPosts.length > 0) {
        const postIds = filteredPosts.map(p => p.id);
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", userId)
          .in("post_id", postIds);

        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        filteredPosts = filteredPosts.map(post => ({
          ...post,
          is_liked: likedPostIds.has(post.id)
        }));
      }

      setPosts(filteredPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({ title: "오류", description: "소식을 불러오지 못했습니다", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeFilter, userId, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleLikeToggle = async (postId: string, isLiked: boolean) => {
    if (!userId) return;

    try {
      if (isLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("user_id", userId)
          .eq("post_id", postId);
      } else {
        await supabase
          .from("post_likes")
          .insert({ user_id: userId, post_id: postId });
      }

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked: !isLiked,
            like_count: post.like_count + (isLiked ? -1 : 1)
          };
        }
        return post;
      }));
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handlePostCreated = () => {
    setIsCreateDialogOpen(false);
    fetchPosts();
    toast({ title: "등록 완료", description: "소식이 등록되었습니다" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
          </div>
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold">전체 학원 소식</span>
          </div>
        </div>
      </header>

      {/* Migration Notice */}
      {showMigrationNotice && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <Alert className="bg-warning/10 border-warning/50">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning-foreground">시스템 업데이트 안내</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground mt-1">
              시스템 업데이트로 인해 기존 게시글이 초기화되었습니다. 기존 글을 삭제하고 새로운 양식에 맞춰 소식을 다시 작성해주세요.
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={dismissMigrationNotice}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
      )}

      {/* Filter Chips */}
      <div className="sticky top-14 bg-background/95 backdrop-blur-sm z-30 border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              const isActive = activeFilter === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setActiveFilter(option.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap
                    transition-all border shrink-0
                    ${isActive 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background text-muted-foreground border-border hover:border-primary'}
                  `}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Newspaper className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              아직 등록된 소식이 없어요
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              첫 번째 소식을 등록해보세요
            </p>
            {academyId && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                소식 작성하기
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                onLikeToggle={handleLikeToggle}
                onAcademyClick={(id) => navigate(`/academy/${id}`)}
                onCardClick={() => setSelectedPost(post)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Post Detail Sheet */}
      <FeedPostDetailSheet
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onLikeToggle={handleLikeToggle}
        onAcademyClick={(id) => navigate(`/academy/${id}`)}
      />

      {/* FAB */}
      {academyId && (
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {academyId && (
        <CreatePostDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          academyId={academyId}
          onSuccess={handlePostCreated}
        />
      )}

      <AdminBottomNavigation />
    </div>
  );
};

export default AdminCommunityPage;
