import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Bell, Calendar, PartyPopper, Newspaper, Heart, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import FeedPostDetailSheet from "@/components/FeedPostDetailSheet";

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

interface AcademyNewsTabProps {
  academyId: string;
  academyName: string;
  academyProfileImage: string | null;
}

const typeConfig = {
  notice: { label: '공지', icon: Bell, color: 'bg-blue-500 text-white' },
  seminar: { label: '설명회', icon: Calendar, color: 'bg-orange-500 text-white' },
  event: { label: '이벤트', icon: PartyPopper, color: 'bg-purple-500 text-white' },
};

const AcademyNewsTab = ({ academyId, academyName, academyProfileImage }: AcademyNewsTabProps) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("feed_posts")
          .select("id, academy_id, type, title, body, image_url, like_count, created_at, seminar_id")
          .eq("academy_id", academyId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        
        // Add academy info and check likes
        let postsWithAcademy = (data || []).map(post => ({
          ...post,
          academy: {
            id: academyId,
            name: academyName,
            profile_image: academyProfileImage,
          },
          is_liked: false,
        })) as FeedPost[];

        // Check likes
        if (userId && postsWithAcademy.length > 0) {
          const postIds = postsWithAcademy.map(p => p.id);
          const { data: likes } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", userId)
            .in("post_id", postIds);

          const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
          postsWithAcademy = postsWithAcademy.map(post => ({
            ...post,
            is_liked: likedPostIds.has(post.id)
          }));
        }

        setPosts(postsWithAcademy);
      } catch (error) {
        console.error("Error fetching academy posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [academyId, academyName, academyProfileImage, userId]);

  const getImageUrls = (imageUrl: string | null): string[] => {
    if (!imageUrl) return [];
    try {
      const parsed = JSON.parse(imageUrl);
      return Array.isArray(parsed) ? parsed : [imageUrl];
    } catch {
      return [imageUrl];
    }
  };

  const handleSeminarClick = (seminarId: string) => {
    navigate(`/seminar/${seminarId}`);
  };

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

      // Update selected post as well
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => prev ? {
          ...prev,
          is_liked: !isLiked,
          like_count: prev.like_count + (isLiked ? -1 : 1)
        } : null);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="shadow-card">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6 text-center">
          <Newspaper className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">등록된 소식이 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {posts.map((post) => {
          const config = typeConfig[post.type];
          const TypeIcon = config.icon;
          const imageUrls = getImageUrls(post.image_url);

          return (
            <Card 
              key={post.id} 
              className="shadow-card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedPost(post)}
            >
              <CardContent className="p-4">
                {/* Type Badge & Title */}
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn("text-xs px-2 py-0.5 gap-1", config.color)}>
                    <TypeIcon className="w-3 h-3" />
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
                  </span>
                </div>
                
                <h4 className="font-semibold text-foreground mb-1 line-clamp-1">
                  {post.title}
                </h4>
                
                {post.body && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {post.body}
                  </p>
                )}

                {/* Image Preview */}
                {imageUrls.length > 0 && (
                  <div className="mb-3">
                    <img
                      src={imageUrls[0]}
                      alt={post.title}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Heart className={cn("w-4 h-4", post.is_liked && "fill-destructive text-destructive")} />
                    <span>{post.like_count}</span>
                  </div>
                  
                  {/* Seminar CTA - Direct to seminar detail page */}
                  {post.type === 'seminar' && post.seminar_id && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeminarClick(post.seminar_id!);
                      }}
                      className="gap-1"
                    >
                      설명회 신청하기
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Post Detail Sheet */}
      <FeedPostDetailSheet
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onLikeToggle={handleLikeToggle}
        onAcademyClick={() => {}} // Already on academy page
        onSeminarClick={(seminarId) => navigate(`/seminar/${seminarId}`)}
      />
    </>
  );
};

export default AcademyNewsTab;
