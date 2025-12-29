import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNavigation from "@/components/BottomNavigation";
import Logo from "@/components/Logo";
import QuickCategoryMenu from "@/components/QuickCategoryMenu";
import LearningStyleBanner from "@/components/LearningStyleBanner";
import RegionSelector from "@/components/RegionSelector";
import SeminarCarousel from "@/components/SeminarCarousel";
import CompactAcademyList from "@/components/CompactAcademyList";
import EmptyRegionState from "@/components/EmptyRegionState";

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
}

const HomePage = () => {
  const navigate = useNavigate();
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loadingSeminars, setLoadingSeminars] = useState(true);
  const [loadingAcademies, setLoadingAcademies] = useState(true);
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState("대치동");

  const fetchSeminars = useCallback(async (region: string) => {
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
          academy:academies (
            name,
            address
          )
        `)
        .eq("status", "recruiting")
        .gte("date", new Date().toISOString())
        .order("date", { ascending: true })
        .limit(10);

      if (error) throw error;

      // Filter by region (check location or academy address)
      const filtered = (data || []).filter((seminar: any) => {
        const locationMatch = seminar.location?.includes(region);
        const addressMatch = seminar.academy?.address?.includes(region);
        return locationMatch || addressMatch;
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

  const fetchAcademies = useCallback(async (region: string) => {
    try {
      setLoadingAcademies(true);

      const { data, error } = await supabase
        .from("academies")
        .select("id, name, profile_image, tags, subject, address")
        .ilike("address", `%${region}%`)
        .limit(4);

      if (error) throw error;
      setAcademies(data || []);
    } catch (error) {
      console.error("Error fetching academies:", error);
    } finally {
      setLoadingAcademies(false);
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
  }, []);

  useEffect(() => {
    fetchSeminars(selectedRegion);
    fetchAcademies(selectedRegion);
  }, [selectedRegion, fetchSeminars, fetchAcademies]);

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
  };

  const hasNoData = !loadingSeminars && !loadingAcademies && 
                    seminars.length === 0 && academies.length === 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <RegionSelector 
            selectedRegion={selectedRegion} 
            onRegionChange={handleRegionChange} 
          />
          <Logo size="sm" showText={false} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto py-6">
        {/* Learning Style Banner (only if not completed) */}
        {!checkingProfile && !learningStyle && (
          <section className="mb-6 px-4">
            <LearningStyleBanner />
          </section>
        )}

        {/* Quick Category Menu */}
        <section className="mb-6 px-4">
          <QuickCategoryMenu />
        </section>

        {/* Empty State for Region */}
        {hasNoData ? (
          <EmptyRegionState 
            region={selectedRegion} 
            onRegionChange={handleRegionChange} 
          />
        ) : (
          <>
            {/* Seminar Carousel */}
            <SeminarCarousel 
              seminars={seminars} 
              loading={loadingSeminars} 
            />

            {/* Compact Academy List */}
            <CompactAcademyList
              academies={academies}
              learningStyle={learningStyle}
              loading={loadingAcademies}
            />
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default HomePage;