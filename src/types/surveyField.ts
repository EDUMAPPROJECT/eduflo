export type SurveyFieldType = 'text' | 'multiple_choice' | 'consent';

export interface SurveyField {
  id: string;
  type: SurveyFieldType;
  label: string;
  required: boolean;
  options?: string[]; // for multiple_choice
  consentText?: string; // for consent type
  consentLink?: string; // URL for consent details
}

export interface SurveyAnswer {
  fieldId: string;
  value: string | string[] | boolean;
}
