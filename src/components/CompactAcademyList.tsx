import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight, Sparkles } from "lucide-react";
import { useRoutePrefix } from "@/hooks/useRoutePrefix";

interface Academy {
  id: string;
  name: string;
  profile_image: string | null;
  tags: string[] | null;
  subject: string;
}

interface CompactAcademyListProps {
  academies: Academy[];
  learningStyle: string | null;
  loading: boolean;
  title?: string;
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

const CompactAcademyList = ({ academies, learningStyle, loading, title }: CompactAcademyListProps) => {
  const navigate = useNavigate();
  const prefix = useRoutePrefix();
  const styleTags = learningStyle ? styleTagMap[learningStyle] || [] : [];
  const displayTitle = title || (learningStyle ? "내 성향 맞춤 추천 학원" : "추천 학원");

  const calculateMatchScore = (tags: string[] | null): number => {
    if (!tags || !learningStyle) return 85;
    const matchCount = tags.filter(tag =>
      styleTags.some(styleTag =>
        tag.toLowerCase().includes(styleTag.toLowerCase())
      )
    ).length;
    return Math.min(75 + matchCount * 8, 98);
  };

  if (loading) {
    return (
      <section className="mb-8 px-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">내 성향 맞춤 추천 학원</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-3 animate-pulse">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (academies.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 px-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">{displayTitle}</h3>
      </div>
      
      <div className="space-y-3">
        {academies.slice(0, 4).map((academy) => (
          <Card
            key={academy.id}
            className="p-3 cursor-pointer hover:shadow-md transition-all border-border"
            onClick={() => navigate(`${prefix}/academy/${academy.id}`)}
          >
            <div className="flex gap-3 items-center">
              {/* Logo/Thumbnail */}
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {academy.profile_image ? (
                  <img
                    src={academy.profile_image}
                    alt={academy.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-6 h-6 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground text-sm truncate">
                    {academy.name}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">{academy.subject}</span>
                  {academy.tags?.slice(0, 2).map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="text-xs px-1.5 py-0 h-5 bg-secondary/50"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Match Score */}
              <div className="flex-shrink-0 text-right">
                <Badge className="bg-primary text-primary-foreground font-bold">
                  {calculateMatchScore(academy.tags)}%
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">일치</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* View More Button */}
      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => navigate(`${prefix}/explore`)}
      >
        맞춤 학원 더 보기
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </section>
  );
};

export default CompactAcademyList;