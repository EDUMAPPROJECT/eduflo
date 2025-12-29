import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles } from "lucide-react";

interface Academy {
  id: string;
  name: string;
  profile_image: string | null;
  tags: string[] | null;
  subject: string;
}

interface Props {
  learningStyle: string;
}

const styleTagMap: Record<string, string[]> = {
  self_directed: ["자기주도학습", "1:1 맞춤", "자율학습"],
  balanced: ["체계적 커리큘럼", "소수정예", "학습 피드백"],
  interactive: ["소통 중심", "토론식 수업", "그룹 스터디"],
  mentored: ["밀착관리", "1:1 맞춤", "출결관리"],
};

const styleNameMap: Record<string, string> = {
  self_directed: "자기주도형",
  balanced: "균형형",
  interactive: "소통형",
  mentored: "밀착관리형",
};

const RecommendedAcademies = ({ learningStyle }: Props) => {
  const navigate = useNavigate();
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);

  const styleTags = styleTagMap[learningStyle] || [];
  const styleName = styleNameMap[learningStyle] || "맞춤";

  useEffect(() => {
    fetchRecommendedAcademies();
  }, [learningStyle]);

  const fetchRecommendedAcademies = async () => {
    try {
      const { data, error } = await supabase
        .from("academies")
        .select("id, name, profile_image, tags, subject")
        .limit(3);

      if (error) throw error;

      // Sort by matching tags
      const sorted = (data || [])
        .map(academy => {
          const matchCount = (academy.tags || []).filter(tag =>
            styleTags.some(styleTag =>
              tag.toLowerCase().includes(styleTag.toLowerCase())
            )
          ).length;
          return { ...academy, matchCount };
        })
        .sort((a, b) => b.matchCount - a.matchCount);

      setAcademies(sorted);
    } catch (error) {
      console.error("Error fetching recommended academies:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchScore = (tags: string[] | null): number => {
    if (!tags) return 75;
    const matchCount = tags.filter(tag =>
      styleTags.some(styleTag =>
        tag.toLowerCase().includes(styleTag.toLowerCase())
      )
    ).length;
    return Math.min(75 + matchCount * 8, 98);
  };

  if (loading) {
    return (
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">테스트 결과 기반 추천</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="flex-shrink-0 w-40 p-3 animate-pulse">
              <div className="w-full aspect-square rounded-lg bg-muted mb-2" />
              <div className="h-4 w-20 bg-muted rounded mb-1" />
              <div className="h-3 w-16 bg-muted rounded" />
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (academies.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">
          {styleName} 추천 학원
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {academies.map((academy) => (
          <Card
            key={academy.id}
            className="flex-shrink-0 w-40 p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/academy/${academy.id}`)}
          >
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
              <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                {calculateMatchScore(academy.tags)}% 일치
              </Badge>
            </div>
            <h4 className="font-semibold text-foreground text-sm truncate">
              {academy.name}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {academy.subject}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default RecommendedAcademies;