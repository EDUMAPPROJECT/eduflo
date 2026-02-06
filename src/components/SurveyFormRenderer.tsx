import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { SurveyField, SurveyAnswer } from "@/types/surveyField";

interface SurveyFormRendererProps {
  fields: SurveyField[];
  onSubmit: (answers: Record<string, SurveyAnswer>) => void;
  submitting?: boolean;
  /** If provided, renders as part of a parent form instead of standalone */
  renderOnly?: boolean;
  /** External trigger ref for parent forms */
  formRef?: React.MutableRefObject<{ triggerSubmit: () => void; isValid: () => boolean; getAnswers: () => Record<string, SurveyAnswer> } | null>;
}

function buildSchema(fields: SurveyField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    switch (field.type) {
      case 'text':
        if (field.required) {
          shape[field.id] = z.string().min(1, { message: '내용을 입력해주세요' });
        } else {
          shape[field.id] = z.string().optional().default('');
        }
        break;
      case 'multiple_choice':
        if (field.required) {
          shape[field.id] = z.array(z.string()).min(1, { message: '최소 1개 이상 선택해주세요' });
        } else {
          shape[field.id] = z.array(z.string()).optional().default([]);
        }
        break;
      case 'consent':
        shape[field.id] = z.literal(true, {
          errorMap: () => ({ message: '동의가 필요합니다' }),
        });
        break;
    }
  }

  return z.object(shape);
}

function getDefaults(fields: SurveyField[]): Record<string, any> {
  const defaults: Record<string, any> = {};
  for (const field of fields) {
    switch (field.type) {
      case 'text':
        defaults[field.id] = '';
        break;
      case 'multiple_choice':
        defaults[field.id] = [];
        break;
      case 'consent':
        defaults[field.id] = false;
        break;
    }
  }
  return defaults;
}

const SurveyFormRenderer = ({ fields, onSubmit, submitting, renderOnly, formRef }: SurveyFormRendererProps) => {
  const schema = useMemo(() => buildSchema(fields), [fields]);
  const defaults = useMemo(() => getDefaults(fields), [fields]);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    getValues,
    trigger,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onChange',
  });

  // Expose form API to parent
  if (formRef) {
    formRef.current = {
      triggerSubmit: async () => {
        const valid = await trigger();
        if (valid) {
          const values = getValues();
          const answers: Record<string, SurveyAnswer> = {};
          for (const field of fields) {
            answers[field.id] = { fieldId: field.id, value: values[field.id] };
          }
          onSubmit(answers);
        }
      },
      isValid: () => isValid,
      getAnswers: () => {
        const values = getValues();
        const answers: Record<string, SurveyAnswer> = {};
        for (const field of fields) {
          answers[field.id] = { fieldId: field.id, value: values[field.id] };
        }
        return answers;
      },
    };
  }

  const onFormSubmit = (data: any) => {
    const answers: Record<string, SurveyAnswer> = {};
    for (const field of fields) {
      answers[field.id] = { fieldId: field.id, value: data[field.id] };
    }
    onSubmit(answers);
  };

  if (fields.length === 0) return null;

  const content = (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          {/* Text field */}
          {field.type === 'text' && (
            <>
              <Label className="text-sm whitespace-pre-wrap">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Controller
                name={field.id}
                control={control}
                render={({ field: formField }) => (
                  <Textarea
                    placeholder="답변을 입력하세요"
                    value={formField.value || ''}
                    onChange={formField.onChange}
                    rows={3}
                    maxLength={1000}
                  />
                )}
              />
              {errors[field.id] && (
                <p className="text-xs text-destructive">{(errors[field.id] as any)?.message}</p>
              )}
            </>
          )}

          {/* Multiple choice field */}
          {field.type === 'multiple_choice' && (
            <>
              <Label className="text-sm whitespace-pre-wrap">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <p className="text-xs text-muted-foreground">복수 선택 가능</p>
              <Controller
                name={field.id}
                control={control}
                render={({ field: formField }) => (
                  <div className="space-y-2">
                    {field.options?.map((option, optIdx) => {
                      if (!option.trim()) return null;
                      const checked = (formField.value as string[] || []).includes(option);
                      return (
                        <label
                          key={optIdx}
                          className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(isChecked) => {
                              const current = formField.value as string[] || [];
                              if (isChecked) {
                                formField.onChange([...current, option]);
                              } else {
                                formField.onChange(current.filter((v: string) => v !== option));
                              }
                            }}
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              />
              {errors[field.id] && (
                <p className="text-xs text-destructive">{(errors[field.id] as any)?.message}</p>
              )}
            </>
          )}

          {/* Consent field */}
          {field.type === 'consent' && (
            <>
              <Controller
                name={field.id}
                control={control}
                render={({ field: formField }) => (
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={formField.value === true}
                      onCheckedChange={(checked) => formField.onChange(checked === true)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm">
                        {field.consentText || field.label}
                        <span className="text-destructive ml-1">*</span>
                      </span>
                      {field.consentLink && (
                        <a
                          href={field.consentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-primary underline mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          자세히 보기
                        </a>
                      )}
                    </div>
                  </label>
                )}
              />
              {errors[field.id] && (
                <p className="text-xs text-destructive">{(errors[field.id] as any)?.message}</p>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );

  if (renderOnly) {
    return content;
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {content}
    </form>
  );
};

export default SurveyFormRenderer;
