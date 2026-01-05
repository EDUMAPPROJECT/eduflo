import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Home, RefreshCw } from "lucide-react";
import { getTagLabel, TAG_CATEGORIES, getTagCategory } from "@/lib/tagDictionary";

const PreferenceResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const profileTags: string[] = location.state?.profileTags || [];

  // Group tags by category for display
  const tagsByCategory: Record<string, string[]> = {};
  profileTags.forEach(tag => {
    const category = getTagCategory(tag);
    if (!tagsByCategory[category]) tagsByCategory[category] = [];
    tagsByCategory[category].push(tag);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
      {/* Hero Section */}
      <div className="pt-12 pb-8 px-4 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
          <Sparkles className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          맞춤 추천 준비 완료!
        </h1>
        <p className="text-muted-foreground">
          선택하신 조건에 맞는 학원을 찾아드릴게요
        </p>
      </div>

      {/* Selected Preferences Summary */}
      <main className="max-w-lg mx-auto px-4 pb-8">
        <Card className="shadow-card mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">나의 학습 프로필</h2>
            
            <div className="space-y-4">
              {Object.entries(tagsByCategory).map(([categoryKey, tags]) => {
                const category = TAG_CATEGORIES[categoryKey];
                if (!category) return null;
                
                return (
                  <div key={categoryKey}>
                    <p className="text-sm text-muted-foreground mb-2">
                      {category.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-sm">
                          {getTagLabel(tag)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate("/explore")} 
            className="w-full gap-2"
            size="lg"
          >
            맞춤 학원 보러가기
            <ArrowRight className="w-4 h-4" />
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate("/home")}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              홈으로
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/preference-test")}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              다시 하기
            </Button>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          프로필은 마이페이지에서 언제든 수정할 수 있어요
        </p>
      </main>
    </div>
  );
};

export default PreferenceResult;
