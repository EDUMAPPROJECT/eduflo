import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PARENT_TEST_QUESTIONS, getTagLabel } from "@/lib/tagDictionary";
import { cn } from "@/lib/utils";

const PreferenceTest = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        toast.error("로그인이 필요합니다");
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });
  }, [navigate]);

  const currentQuestion = PARENT_TEST_QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / PARENT_TEST_QUESTIONS.length) * 100;
  const isLastStep = currentStep === PARENT_TEST_QUESTIONS.length - 1;

  const handleSelect = (tagKey: string) => {
    const category = currentQuestion.category;
    const currentAnswers = answers[category] || [];

    if (currentQuestion.multiSelect) {
      if (currentAnswers.includes(tagKey)) {
        // Deselect
        setAnswers({
          ...answers,
          [category]: currentAnswers.filter(k => k !== tagKey)
        });
      } else {
        // Select (check max limit)
        const maxSelect = currentQuestion.maxSelect || 999;
        if (currentAnswers.length < maxSelect) {
          setAnswers({
            ...answers,
            [category]: [...currentAnswers, tagKey]
          });
        }
      }
    } else {
      // Single select
      setAnswers({
        ...answers,
        [category]: [tagKey]
      });
    }
  };

  const isSelected = (tagKey: string) => {
    const category = currentQuestion.category;
    return (answers[category] || []).includes(tagKey);
  };

  const canProceed = () => {
    if (!currentQuestion.required) return true;
    const category = currentQuestion.category;
    return (answers[category] || []).length > 0;
  };

  const handleNext = () => {
    if (!canProceed() && currentQuestion.required) {
      toast.error("필수 항목을 선택해주세요");
      return;
    }
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate(-1);
    }
  };

  const handleSkip = () => {
    if (!currentQuestion.required) {
      if (isLastStep) {
        handleSubmit();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Collect all selected tags
      const profileTags: string[] = Object.values(answers).flat();

      // Update profile with tags
      const { error } = await supabase
        .from("profiles")
        .update({ profile_tags: profileTags })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("테스트가 완료되었습니다!");
      navigate("/preference-result", { state: { profileTags } });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-muted rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <Progress value={progress} className="h-2" />
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            {currentStep + 1}/{PARENT_TEST_QUESTIONS.length}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Question */}
        <div className="mb-8">
          <Badge variant="secondary" className="mb-4">
            {currentQuestion.id}
          </Badge>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {currentQuestion.question}
          </h1>
          {currentQuestion.description && (
            <p className="text-muted-foreground">
              {currentQuestion.description}
            </p>
          )}
        </div>

        {/* Options */}
        <div className="grid gap-3 mb-8">
          {currentQuestion.options.map((option) => {
            const selected = isSelected(option.key);
            return (
              <Card
                key={option.key}
                className={cn(
                  "cursor-pointer transition-all duration-200 border-2",
                  selected
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border hover:border-primary/50 hover:shadow-card"
                )}
                onClick={() => handleSelect(option.key)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <span className={cn(
                    "font-medium",
                    selected ? "text-primary" : "text-foreground"
                  )}>
                    {option.label}
                  </span>
                  {selected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {!currentQuestion.required && (
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
              disabled={isSubmitting}
            >
              {currentQuestion.skipLabel || "건너뛰기"}
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="flex-1 gap-2"
            disabled={!canProceed() || isSubmitting}
          >
            {isSubmitting ? (
              "저장 중..."
            ) : isLastStep ? (
              <>
                <Sparkles className="w-4 h-4" />
                결과 보기
              </>
            ) : (
              <>
                다음
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {/* Selected summary for multi-select */}
        {currentQuestion.multiSelect && (answers[currentQuestion.category] || []).length > 0 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">선택됨:</p>
            <div className="flex flex-wrap gap-2">
              {(answers[currentQuestion.category] || []).map(tagKey => (
                <Badge key={tagKey} variant="default">
                  {getTagLabel(tagKey)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PreferenceTest;
