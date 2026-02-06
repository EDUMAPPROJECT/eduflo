import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, GripVertical, FileText, ListChecks, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { SurveyField, SurveyFieldType } from "@/types/surveyField";

interface SurveyFormBuilderProps {
  fields: SurveyField[];
  onChange: (fields: SurveyField[]) => void;
  maxFields?: number;
}

const generateId = () => Math.random().toString(36).substring(2, 10);

const fieldTypeLabels: Record<SurveyFieldType, string> = {
  text: '주관식',
  multiple_choice: '객관식 (복수선택)',
  consent: '필수 동의',
};

const fieldTypeIcons: Record<SurveyFieldType, React.ReactNode> = {
  text: <FileText className="w-4 h-4" />,
  multiple_choice: <ListChecks className="w-4 h-4" />,
  consent: <ShieldCheck className="w-4 h-4" />,
};

const SurveyFormBuilder = ({ fields, onChange, maxFields = 20 }: SurveyFormBuilderProps) => {
  const [addingType, setAddingType] = useState<SurveyFieldType | ''>('');

  const addField = (type: SurveyFieldType) => {
    if (fields.length >= maxFields) {
      toast.error(`설문 항목은 최대 ${maxFields}개까지 추가할 수 있습니다`);
      return;
    }

    const newField: SurveyField = {
      id: generateId(),
      type,
      label: '',
      required: type === 'consent',
      ...(type === 'multiple_choice' ? { options: ['', ''] } : {}),
      ...(type === 'consent' ? { consentText: '', consentLink: '' } : {}),
    };

    onChange([...fields, newField]);
    setAddingType('');
  };

  const updateField = (id: string, updates: Partial<SurveyField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const addOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;
    if (field.options.length >= 10) {
      toast.error('선택지는 최대 10개까지 추가할 수 있습니다');
      return;
    }
    updateField(fieldId, { options: [...field.options, ''] });
  };

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;
    const newOptions = [...field.options];
    newOptions[optionIndex] = value;
    updateField(fieldId, { options: newOptions });
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options || field.options.length <= 2) {
      toast.error('최소 2개의 선택지가 필요합니다');
      return;
    }
    updateField(fieldId, { options: field.options.filter((_, i) => i !== optionIndex) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">설문 항목 (최대 {maxFields}개)</Label>
        <span className="text-xs text-muted-foreground">{fields.length}/{maxFields}</span>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">
          아래 버튼으로 설문 항목을 추가하세요.
        </p>
      )}

      {fields.map((field, index) => (
        <Card key={field.id} className="border border-border">
          <CardContent className="p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground flex items-center gap-1">
                  {fieldTypeIcons[field.type]}
                  {fieldTypeLabels[field.type]}
                </span>
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeField(field.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Text field */}
            {field.type === 'text' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">질문</Label>
                  <Textarea
                    placeholder="예: 궁금한 점을 자유롭게 적어주세요"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    rows={2}
                    maxLength={200}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.required}
                    onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                  />
                  <Label className="text-xs">{field.required ? '필수' : '선택'}</Label>
                </div>
              </>
            )}

            {/* Multiple choice field */}
            {field.type === 'multiple_choice' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">질문</Label>
                  <Textarea
                    placeholder="예: 관심 있는 과목을 선택해주세요"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    rows={2}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">선택지</Label>
                  {field.options?.map((option, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-right">{optIdx + 1}.</span>
                      <Input
                        placeholder={`선택지 ${optIdx + 1}`}
                        value={option}
                        onChange={(e) => updateOption(field.id, optIdx, e.target.value)}
                        maxLength={100}
                        className="h-8 text-sm"
                      />
                      {(field.options?.length || 0) > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeOption(field.id, optIdx)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => addOption(field.id)}
                    disabled={(field.options?.length || 0) >= 10}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    선택지 추가
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.required}
                    onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                  />
                  <Label className="text-xs">{field.required ? '필수 (최소 1개 선택)' : '선택'}</Label>
                </div>
              </>
            )}

            {/* Consent field */}
            {field.type === 'consent' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">동의 항목 텍스트</Label>
                  <Input
                    placeholder="예: 개인정보 처리방침에 동의합니다"
                    value={field.consentText || ''}
                    onChange={(e) => updateField(field.id, { consentText: e.target.value, label: e.target.value })}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">링크 URL (선택)</Label>
                  <Input
                    placeholder="https://example.com/privacy"
                    value={field.consentLink || ''}
                    onChange={(e) => updateField(field.id, { consentLink: e.target.value })}
                    maxLength={500}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  ※ 동의 항목은 항상 필수입니다. 체크해야만 제출 가능합니다.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add field buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => addField('text')}
          disabled={fields.length >= maxFields}
        >
          <FileText className="w-3 h-3" />
          주관식 추가
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => addField('multiple_choice')}
          disabled={fields.length >= maxFields}
        >
          <ListChecks className="w-3 h-3" />
          객관식 추가
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => addField('consent')}
          disabled={fields.length >= maxFields}
        >
          <ShieldCheck className="w-3 h-3" />
          동의 항목 추가
        </Button>
      </div>
    </div>
  );
};

export default SurveyFormBuilder;
