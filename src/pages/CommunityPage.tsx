import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRegion } from "@/contexts/RegionContext";
import { useToast } from "@/hooks/use-toast";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useRoutePrefix } from "@/hooks/useRoutePrefix";
import BottomNavigation from "@/components/BottomNavigation";
import Logo from "@/components/Logo";
import GlobalRegionSelector from "@/components/GlobalRegionSelector";
import FeedPostCard from "@/components/FeedPostCard";
import FeedPostDetailSheet from "@/components/FeedPostDetailSheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Newspaper, 
  Bell, 
  PartyPopper, 
  Calendar, 
  Bookmark, 
  Search,
  Loader2,
  GraduationCap,
  Megaphone
} from "lucide-react";

interface FeedPost {
  id: string;
  academy_id: string | null;
  type: 'notice' | 'seminar' | 'event' | 'admission';
  title: string;
  body: string | null;
  image_url: string | null;
  target_regions: string[];
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
  is_liked?: boolean;
}

const PAGE_SIZE = 15;

const filterOptions = [
  { id: 'all', label: '전체', icon: null },
  { id: 'notice', label: '학원 소식', icon: Megaphone },
  { id: 'admission', label: '입시 정보', icon: GraduationCap },
  { id: 'seminar', label: '설명회', icon: Calendar },
  { id: 'event', label: '이벤트', icon: PartyPopper },
];

const CommunityPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedRegion } = useRegion();
  const prefix = useRoutePrefix();
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmarkedAcademies, setBookmarkedAcademies] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);

  // Fetch function for infinite scroll
  const fetchPosts = useCallback(async (page: number): Promise<{ data: FeedPost[]; hasMore: boolean }> => {
    try {
      // First, get academies that target the selected region
      const { data: academiesInRegion } = await supabase
        .from("academies")
        .select("id")
        .contains("target_regions", [selectedRegion]);

      const academyIds = academiesInRegion?.map(a => a.id) || [];

      // Build queries for both academy posts and super admin posts
      let academyQuery = supabase
        .from("feed_posts")
        .select(`
          *,
          academy:academies(id, name, profile_image, target_regions)
        `)
        .not("academy_id", "is", null);
      
      if (academyIds.length > 0) {
        academyQuery = academyQuery.in("academy_id", academyIds);
      } else {
        // If no academies in region, only get super admin posts
        academyQuery = academyQuery.eq("academy_id", "00000000-0000-0000-0000-000000000000"); // impossible match
      }

      // Super admin posts (no academy_id)
      let superAdminQuery = supabase
        .from("feed_posts")
        .select("*")
        .is("academy_id", null);

      if (activeFilter !== 'all' && activeFilter !== 'bookmarked') {
        academyQuery = academyQuery.eq("type", activeFilter);
        superAdminQuery = superAdminQuery.eq("type", activeFilter);
      }

      const [academyResult, superAdminResult] = await Promise.all([
        academyQuery.order("created_at", { ascending: false }),
        superAdminQuery.order("created_at", { ascending: false })
      ]);

      let allPosts: FeedPost[] = [];
      
      // Add academy posts
      if (academyResult.data) {
        allPosts = [...(academyResult.data as unknown as FeedPost[])];
      }

      // Add super admin posts with author info
      if (superAdminResult.data && superAdminResult.data.length > 0) {
        const authorIds = [...new Set(superAdminResult.data.filter(p => p.author_id).map(p => p.author_id))];
        let authorsMap: Record<string, string> = {};
        
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, user_name")
            .in("id", authorIds);
          
          if (profiles) {
            authorsMap = profiles.reduce((acc, p) => {
              acc[p.id] = p.user_name || '관리자';
              return acc;
            }, {} as Record<string, string>);
          }
        }

        const superAdminPosts = superAdminResult.data.map(post => ({
          ...post,
          academy: null,
          author: { user_name: post.author_id ? authorsMap[post.author_id] || '관리자' : '관리자' }
        })) as unknown as FeedPost[];

        allPosts = [...allPosts, ...superAdminPosts];
      }

      // Sort by created_at
      allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Paginate
      const paginatedPosts = allPosts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

      // Filter by bookmarked academies if needed
      let posts = paginatedPosts;
      if (activeFilter === 'bookmarked') {
        posts = posts.filter(post => post.academy_id && bookmarkedAcademies.includes(post.academy_id));
      }

      // Check which posts the user has liked
      if (userId && posts.length > 0) {
        const postIds = posts.map(p => p.id);
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", userId)
          .in("post_id", postIds);

        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        posts = posts.map(post => ({
          ...post,
          is_liked: likedPostIds.has(post.id)
        }));
      }

      return { data: posts, hasMore: posts.length === PAGE_SIZE };
    } catch (error) {
      console.error("Error fetching posts:", error);
      return { data: [], hasMore: false };
    }
  }, [selectedRegion, activeFilter, bookmarkedAcademies, userId]);

  const {
    items: posts,
    setItems: setPosts,
    loading,
    loadingMore,
    hasMore,
    reset,
    setLoadMoreElement
  } = useInfiniteScroll<FeedPost>({ fetchFn: fetchPosts, pageSize: PAGE_SIZE });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);

        // Get bookmarked academies
        const { data: bookmarks } = await supabase
          .from("bookmarks")
          .select("academy_id")
          .eq("user_id", session.user.id);
        
        if (bookmarks) {
          setBookmarkedAcademies(bookmarks.map(b => b.academy_id));
        }
      }
    };
    init();
  }, []);

  // Reset and refetch when filter or region changes
  useEffect(() => {
    reset();
  }, [selectedRegion, activeFilter, reset]);

  const handleLikeToggle = async (postId: string, isLiked: boolean) => {
    if (!userId) {
      toast({ title: "로그인 필요", description: "좋아요를 누르려면 로그인하세요" });
      return;
    }

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

      // Update local state optimistically
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
      toast({ title: "오류", description: "좋아요 처리에 실패했습니다", variant: "destructive" });
    }
  };


  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <GlobalRegionSelector />
          </div>
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold">학원 소식</span>
          </div>
        </div>
      </header>

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
        {loading && posts.length === 0 ? (
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
              {activeFilter === 'bookmarked' 
                ? "관심 학원을 찜해보세요" 
                : "새로운 학원 소식을 기다려주세요"}
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate(`${prefix}/explore`)}
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              탐색하러 가기
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                onLikeToggle={handleLikeToggle}
                onAcademyClick={(id) => navigate(`${prefix}/academy/${id}`)}
                onCardClick={() => setSelectedPost(post)}
              />
            ))}
            
            {/* Infinite scroll trigger */}
            <div ref={setLoadMoreElement} className="py-4 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">불러오는 중...</span>
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <p className="text-sm text-muted-foreground">모든 소식을 불러왔습니다</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Post Detail Sheet */}
      <FeedPostDetailSheet
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onLikeToggle={(postId, isLiked) => {
          handleLikeToggle(postId, isLiked);
          // Update selected post state as well
          if (selectedPost && selectedPost.id === postId) {
            setSelectedPost(prev => prev ? {
              ...prev,
              is_liked: !isLiked,
              like_count: prev.like_count + (isLiked ? -1 : 1)
            } : null);
          }
        }}
        onAcademyClick={(id) => navigate(`${prefix}/academy/${id}`)}
        onSeminarClick={(seminarId) => navigate(`${prefix}/seminar/${seminarId}`)}
      />

      <BottomNavigation />
    </div>
  );
};

export default CommunityPage;
