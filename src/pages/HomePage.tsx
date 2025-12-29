import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNavigation from "@/components/BottomNavigation";
import Logo from "@/components/Logo";
import QuickCategoryMenu from "@/components/QuickCategoryMenu";
import SeminarFeedCard from "@/components/SeminarFeedCard";
import EmptySeminarState from "@/components/EmptySeminarState";
import LearningStyleBanner from "@/components/LearningStyleBanner";
import RecommendedAcademies from "@/components/RecommendedAcademies";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw } from "lucide-react";

interface Seminar {
  id: string;
  title: string;
  date: string;
  location: string | null;
  image_url: string | null;
  subject: string | null;
  target_grade: string | null;
  status: "recruiting" | "closed";
  academy?: {
    name: string;
    profile_image: string | null;
  } | null;
}

const ITEMS_PER_PAGE = 5;

const HomePage = () => {
  const navigate = useNavigate();
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const fetchSeminars = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from("seminars")
        .select(`
          id,
          title,
          date,
          location,
          image_url,
          subject,
          target_grade,
          status,
          academy:academies (
            name,
            profile_image
          )
        `)
        .eq("status", "recruiting")
        .gte("date", new Date().toISOString())
        .order("date", { ascending: true })
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      const fetchedData = (data as any) || [];
      
      if (append) {
        setSeminars(prev => [...prev, ...fetchedData]);
      } else {
        setSeminars(fetchedData);
      }
      
      setHasMore(fetchedData.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching seminars:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const checkUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("learning_style")
            .eq("id", user.id)
            .maybeSingle();
          
          if (profile?.learning_style) {
            setLearningStyle(profile.learning_style);
          }
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkUserProfile();
    fetchSeminars(0);
  }, [fetchSeminars]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSeminars(nextPage, true);
  };

  const handleRefresh = () => {
    setPage(0);
    fetchSeminars(0);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="text-sm">서울시 강남구</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Learning Style Banner or Recommended Academies */}
        {!checkingProfile && (
          learningStyle ? (
            <RecommendedAcademies learningStyle={learningStyle} />
          ) : (
            <section className="mb-6">
              <LearningStyleBanner />
            </section>
          )
        )}

        {/* Quick Category Menu */}
        <section className="mb-8">
          <h3 className="font-semibold text-foreground mb-4">빠른 카테고리</h3>
          <QuickCategoryMenu />
        </section>

        {/* Seminar Feed */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground text-lg">
                🎯 지금 바로 신청 가능한 설명회
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                놓치면 안 될 이번 달 설명회
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="text-muted-foreground"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                    <div className="h-6 w-3/4 bg-muted rounded" />
                    <div className="h-4 w-1/2 bg-muted rounded" />
                    <div className="h-4 w-2/3 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : seminars.length === 0 ? (
            <EmptySeminarState />
          ) : (
            <div className="space-y-5">
              {seminars.map((seminar) => (
                <SeminarFeedCard
                  key={seminar.id}
                  id={seminar.id}
                  title={seminar.title}
                  date={seminar.date}
                  location={seminar.location}
                  imageUrl={seminar.image_url}
                  subject={seminar.subject}
                  targetGrade={seminar.target_grade}
                  status={seminar.status}
                  academy={seminar.academy}
                />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        불러오는 중...
                      </>
                    ) : (
                      "더보기"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default HomePage;