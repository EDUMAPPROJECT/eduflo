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
import CompactAcademyList from "@/components/CompactAcademyList";
import EmptyRegionState from "@/components/EmptyRegionState";
import AcademyNewsFeed from "@/components/AcademyNewsFeed";
import PostDetailDialog from "@/components/PostDetailDialog";
import AdminHeader from "@/components/AdminHeader";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import RecommendedAcademies from "@/components/RecommendedAcademies";

interface Seminar {
  id: string;
  title: string;
  date: string;
  image_url: string | null;
  academy?: {
    name: string;
  } | null;
}

interface Academy {
  id: string;
  name: string;
  profile_image: string | null;
  tags: string[] | null;
  subject: string;
  address: string | null;
  target_regions?: string[] | null;
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
  const { selectedRegion, selectedRegionName } = useRegion();
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingSeminars, setLoadingSeminars] = useState(true);
  const [loadingAcademies, setLoadingAcademies] = useState(true);
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
        .order("date", { ascending: true })
        .limit(10);

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

  const fetchAcademies = useCallback(async (regionId: string) => {
    try {
      setLoadingAcademies(true);

      const { data, error } = await supabase
        .from("academies")
        .select("id, name, profile_image, tags, subject, address, target_regions")
        .contains("target_regions", [regionId])
        .limit(4);

      if (error) throw error;
      setAcademies(data || []);
    } catch (error) {
      console.error("Error fetching academies:", error);
    } finally {
      setLoadingAcademies(false);
    }
  }, []);

  const fetchPosts = useCallback(async (regionId: string) => {
    try {
      setLoadingPosts(true);

      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          content,
          category,
          image_url,
          created_at,
          academy:academies!inner (
            id,
            name,
            profile_image,
            target_regions
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter by target_regions
      const filtered = (data || []).filter((post: any) => {
        const regions = post.academy?.target_regions || [];
        return regions.includes(regionId);
      });

      setPosts(filtered.map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        category: p.category,
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
          if (profile?.user_name) {
            setUserName(profile.user_name);
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
    fetchAcademies(selectedRegion);
    fetchPosts(selectedRegion);
  }, [selectedRegion, fetchSeminars, fetchAcademies, fetchPosts]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setPostDialogOpen(true);
  };

  const hasNoData = !loadingSeminars && !loadingAcademies && 
                    seminars.length === 0 && academies.length === 0;

  const displayName = userName || "학부모";
  const recommendationTitle = learningStyle 
    ? `${displayName}님을 위한 추천 학원`
    : "지금 동탄에서 가장 인기있는 학원";

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

        {/* Greeting */}
        <section className="mb-4 px-4">
          <h2 className="text-lg font-semibold text-foreground">
            {userName || "학부모"}님 안녕하세요!
          </h2>
        </section>

        {/* Quick Action Menu */}
        <section className="mb-6 px-4">
          <QuickActionMenu />
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

            {/* Compact Academy List */}
            <CompactAcademyList
              academies={academies}
              learningStyle={learningStyle}
              loading={loadingAcademies}
              title={recommendationTitle}
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
