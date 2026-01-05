import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, Target } from "lucide-react";
import { TAG_OPTIONS, TAG_CATEGORIES, getTagLabel, TagOption } from "@/lib/tagDictionary";
import { cn } from "@/lib/utils";

interface AcademyTargetTagsEditorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

const AcademyTargetTagsEditor = ({ 
  selectedTags, 
  onChange, 
  disabled = false 
}: AcademyTargetTagsEditorProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['subject', 'goal', 'style', 'grade']);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleTag = (tagKey: string) => {
    if (disabled) return;
    
    if (selectedTags.includes(tagKey)) {
      onChange(selectedTags.filter(t => t !== tagKey));
    } else {
      onChange([...selectedTags, tagKey]);
    }
  };

  const isSelected = (tagKey: string) => selectedTags.includes(tagKey);

  // Categories to display (excluding budget for academy)
  const displayCategories = ['subject', 'goal', 'style', 'grade', 'class_size', 'delivery', 'mgmt', 'shuttle'];

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          타겟 학생 설정
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          우리 학원에 맞는 학생 유형을 선택하면 맞춤 추천에 활용됩니다
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {displayCategories.map(categoryKey => {
          const category = TAG_CATEGORIES[categoryKey];
          const options = TAG_OPTIONS[categoryKey] || [];
          const isExpanded = expandedCategories.includes(categoryKey);
          const selectedInCategory = selectedTags.filter(t => t.startsWith(`${categoryKey}:`));

          return (
            <div key={categoryKey} className="space-y-3">
              <button
                onClick={() => toggleCategory(categoryKey)}
                className="w-full flex items-center justify-between"
                disabled={disabled}
              >
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium cursor-pointer">
                    {category?.label || categoryKey}
                  </Label>
                  {category?.required && (
                    <Badge variant="outline" className="text-[10px]">필수</Badge>
                  )}
                  {selectedInCategory.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedInCategory.length}개 선택
                    </Badge>
                  )}
                </div>
              </button>
              
              {isExpanded && (
                <div className="flex flex-wrap gap-2">
                  {options.map((option: TagOption) => {
                    const selected = isSelected(option.key);
                    return (
                      <button
                        key={option.key}
                        onClick={() => toggleTag(option.key)}
                        disabled={disabled}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-foreground border-border hover:border-primary/50",
                          disabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {selected && <Check className="w-3 h-3 inline mr-1" />}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Selected Summary */}
        {selectedTags.length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">
              선택된 타겟 태그 ({selectedTags.length}개)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map(tag => (
                <Badge key={tag} variant="default" className="text-xs">
                  {getTagLabel(tag)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AcademyTargetTagsEditor;
