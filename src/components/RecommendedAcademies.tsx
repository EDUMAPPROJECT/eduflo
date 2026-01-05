import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { calculateMatchScore, getTagLabel, MatchResult } from "@/lib/tagDictionary";

interface Academy {
  id: string;
  name: string;
  profile_image: string | null;
  tags: string[] | null;
  target_tags: string[] | null;
  subject: string;
}

interface RankedAcademy extends Academy {
  matchResult: MatchResult;
}

interface Props {
  profileTags?: string[];
  childName?: string;
  maxCount?: number;
}

const RecommendedAcademies = ({ profileTags, childName, maxCount = 3 }: Props) => {
  const navigate = useNavigate();
  const [rankedAcademies, setRankedAcademies] = useState<RankedAcademy[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasProfileTags, setHasProfileTags] = useState(false);

  useEffect(() => {
    fetchAndRankAcademies();
  }, [profileTags]);

  const fetchAndRankAcademies = async () => {
    try {
      // If no profileTags provided, try to fetch from current user
      let userTags = profileTags;
      
      if (!userTags || userTags.length === 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("profile_tags")
            .eq("id", session.user.id)
            .maybeSingle();
          
          userTags = profile?.profile_tags || [];
        }
      }

      setHasProfileTags(userTags && userTags.length > 0);

      if (!userTags || userTags.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch more academies for proper ranking (up to 100)
      const { data, error } = await supabase
        .from("academies")
        .select("id, name, profile_image, tags, target_tags, subject")
        .limit(100);

      if (error) throw error;

      // Calculate match scores and rank
      const ranked: RankedAcademy[] = (data || [])
        .map(academy => {
          // Use target_tags if available, otherwise fall back to tags
          const academyTags = academy.target_tags?.length 
            ? academy.target_tags 
            : (academy.tags || []);
          
          const matchResult = calculateMatchScore(userTags!, academyTags);
          return { ...academy, matchResult };
        })
        .filter(a => a.matchResult.score > 0)
        .sort((a, b) => b.matchResult.score - a.matchResult.score)
        .slice(0, maxCount);

      setRankedAcademies(ranked);
    } catch (error) {
      console.error("Error fetching recommended academies:", error);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">맞춤 추천 학원</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="flex-shrink-0 w-44 p-3 animate-pulse">
              <div className="w-full aspect-square rounded-lg bg-muted mb-2" />
              <div className="h-4 w-20 bg-muted rounded mb-1" />
              <div className="h-3 w-16 bg-muted rounded" />
            </Card>
          ))}
        </div>
      </section>
    );
  }

  // No profile tags - show CTA
  if (!hasProfileTags) {
    return (
      <section className="mb-6">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground mb-1">
                1분 테스트로 맞춤 추천 받기
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                자녀에게 딱 맞는 학원을 찾아드려요
              </p>
              <Button 
                onClick={() => navigate("/preference-test")}
                size="sm"
                className="gap-2"
              >
                테스트 시작
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </section>
    );
  }

  // No matching academies
  if (rankedAcademies.length === 0) {
    return (
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">맞춤 추천 학원</h3>
        </div>
        <Card className="p-6 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            조건에 맞는 학원을 찾지 못했어요
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => navigate("/explore")}
          >
            전체 학원 보기
          </Button>
        </Card>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">
            {childName ? `${childName}에게 맞는 학원` : "테스트 결과 기반 추천"}
          </h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/preference-test")}
          className="text-xs text-muted-foreground"
        >
          성향 수정
        </Button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {rankedAcademies.map((academy) => (
          <Card
            key={academy.id}
            className="flex-shrink-0 w-44 p-3 cursor-pointer hover:shadow-md transition-shadow border-border"
            onClick={() => navigate(`/academy/${academy.id}`)}
          >
            {/* Image with score badge */}
            <div className="relative w-full aspect-square rounded-lg bg-muted mb-2 overflow-hidden">
              {academy.profile_image ? (
                <img
                  src={academy.profile_image}
                  alt={academy.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <Badge 
                className={`absolute top-2 left-2 text-xs ${
                  academy.matchResult.score >= 80 
                    ? "bg-primary text-primary-foreground" 
                    : academy.matchResult.score >= 60
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {academy.matchResult.score}% 일치
              </Badge>
              {academy.matchResult.score < 60 && (
                <Badge 
                  variant="outline" 
                  className="absolute top-2 right-2 text-[10px] bg-background/80"
                >
                  정확도 낮음
                </Badge>
              )}
            </div>
            
            {/* Academy info */}
            <h4 className="font-semibold text-foreground text-sm truncate mb-1">
              {academy.name}
            </h4>
            <p className="text-xs text-muted-foreground truncate mb-2">
              {academy.subject}
            </p>
            
            {/* Match reasons */}
            {academy.matchResult.reasons.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {academy.matchResult.reasons.slice(0, 2).map((reason, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="text-[10px] px-1.5 py-0"
                  >
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
};

export default RecommendedAcademies;
