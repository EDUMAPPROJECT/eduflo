import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRegion } from "@/contexts/RegionContext";
import BottomNavigation from "@/components/BottomNavigation";
import Logo from "@/components/Logo";
import QuickActionMenu from "@/components/QuickActionMenu";
import LearningStyleBanner from "@/components/LearningStyleBanner";
import GlobalRegionSelector from "@/components/GlobalRegionSelector";
import SeminarCarousel from "@/components/SeminarCarousel";
import EmptyRegionState from "@/components/EmptyRegionState";
import AcademyNewsFeed from "@/components/AcademyNewsFeed";
import PostDetailDialog from "@/components/PostDetailDialog";
import AdminHeader from "@/components/AdminHeader";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import RecommendedAcademies from "@/components/RecommendedAcademies";
import TodayScheduleSection from "@/components/TodayScheduleSection";

interface Seminar {
  id: string;
  title: string;
  date: string;
  image_url: string | null;
  academy?: {
    name: string;
  } | null;
}

interface Post {
  id: string;
  title: string;
  content: string | null;
  category: string;
  image_url: string | null;
  created_at: string;
  academy: {
    id: string;
    name: string;
    profile_image: string | null;
  };
}

const HomePage = () => {
  const navigate = useNavigate();
  const { selectedRegion } = useRegion();
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingSeminars, setLoadingSeminars] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  const fetchSeminars = useCallback(async (regionId: string) => {
    try {
      setLoadingSeminars(true);

      // Calculate 3 weeks from now
      const threeWeeksFromNow = new Date();
      threeWeeksFromNow.setDate(threeWeeksFromNow.getDate() + 21);

      const { data, error } = await supabase
        .from("seminars")
        .select(`
          id,
          title,
          date,
          image_url,
          location,
          academy:academies!inner (
            name,
            target_regions
          )
        `)
        .eq("status", "recruiting")
        .gte("date", new Date().toISOString())
        .lte("date", threeWeeksFromNow.toISOString())
        .order("date", { ascending: true });

      if (error) throw error;

      // Filter by target_regions
      const filtered = (data || []).filter((seminar: any) => {
        const regions = seminar.academy?.target_regions || [];
        return regions.includes(regionId);
      });

      setSeminars(filtered.map((s: any) => ({
        id: s.id,
        title: s.title,
        date: s.date,
        image_url: s.image_url,
        academy: s.academy ? { name: s.academy.name } : null,
      })));
    } catch (error) {
      console.error("Error fetching seminars:", error);
    } finally {
      setLoadingSeminars(false);
    }
  }, []);

  const fetchPosts = useCallback(async (regionId: string) => {
    try {
      setLoadingPosts(true);

      const { data, error } = await supabase
        .from("feed_posts")
        .select(`
          id,
          title,
          body,
          type,
          image_url,
          created_at,
          target_regions,
          academy:academies!inner (
            id,
            name,
            profile_image
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter by target_regions (stored on feed_posts table)
      const filtered = (data || []).filter((post: any) => {
        const regions = post.target_regions || [];
        return regions.includes(regionId);
      });

      setPosts(filtered.map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.body,
        category: p.type,
        image_url: p.image_url,
        created_at: p.created_at,
        academy: {
          id: p.academy.id,
          name: p.academy.name,
          profile_image: p.academy.profile_image,
        },
      })));
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    const checkUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("learning_style, user_name, profile_tags")
            .eq("id", user.id)
            .maybeSingle();
          
          if (profile?.learning_style) {
            setLearningStyle(profile.learning_style);
          }
          if (profile?.user_name) {
            setUserName(profile.user_name);
          }
          if (profile?.profile_tags && profile.profile_tags.length > 0) {
            setProfileTags(profile.profile_tags);
          }
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkUserProfile();
  }, []);

  useEffect(() => {
    fetchSeminars(selectedRegion);
    fetchPosts(selectedRegion);
  }, [selectedRegion, fetchSeminars, fetchPosts]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setPostDialogOpen(true);
  };

  const hasNoData = !loadingSeminars && !loadingPosts && seminars.length === 0 && posts.length === 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <GlobalRegionSelector />
          <div className="flex items-center gap-2">
            <AdminHeader />
            <Logo size="sm" showText={false} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto py-6">
        {/* Announcement Banner */}
        <section className="mb-4 px-4">
          <AnnouncementBanner />
        </section>

        {/* Learning Style Banner (only if no profile tags and no learning style) */}
        {!checkingProfile && !learningStyle && profileTags.length === 0 && (
          <section className="mb-6 px-4">
            <LearningStyleBanner />
          </section>
        )}

        {/* Greeting & Quick Action Menu */}
        <section className="mb-6 bg-primary/10 mx-4 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {userName || "학부모"}님 안녕하세요!
          </h2>
          <QuickActionMenu />
        </section>

        {/* Today's Schedule Section */}
        <section className="mb-6 px-4">
          <TodayScheduleSection />
        </section>

        {/* Tag-based Recommended Academies Section */}
        <section className="mb-6 px-4">
          <RecommendedAcademies 
            profileTags={profileTags}
            childName={userName || undefined}
          />
        </section>

        {/* Empty State for Region */}
        {hasNoData ? (
          <EmptyRegionState />
        ) : (
          <>
            {/* Seminar Carousel */}
            <SeminarCarousel 
              seminars={seminars} 
              loading={loadingSeminars} 
            />

            {/* Academy News Feed */}
            <AcademyNewsFeed
              posts={posts}
              loading={loadingPosts}
              onPostClick={handlePostClick}
            />
          </>
        )}
      </main>

      {/* Post Detail Dialog */}
      <PostDetailDialog
        post={selectedPost}
        open={postDialogOpen}
        onClose={() => setPostDialogOpen(false)}
      />

      <BottomNavigation />
    </div>
  );
};

export default HomePage;
