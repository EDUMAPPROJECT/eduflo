// Tag Dictionary - Standard tag keys with Korean labels for UI display
// Format: {category}:{value}

export interface TagOption {
  key: string;
  label: string;
  category: string;
}

export interface TagCategory {
  key: string;
  label: string;
  weight: number;
  required?: boolean;
  multiSelect?: boolean;
  maxSelect?: number;
}

// Category definitions with weights for matching
export const TAG_CATEGORIES: Record<string, TagCategory> = {
  grade: { key: 'grade', label: '학년', weight: 15, required: true },
  subject: { key: 'subject', label: '과목', weight: 25, required: true, multiSelect: true, maxSelect: 3 },
  goal: { key: 'goal', label: '학습 목표', weight: 20, required: true },
  style: { key: 'style', label: '학습 스타일', weight: 15, required: true },
  class_size: { key: 'class_size', label: '수업 규모', weight: 10, required: true },
  delivery: { key: 'delivery', label: '수업 형태', weight: 5, required: true },
  mgmt: { key: 'mgmt', label: '관리 선호', weight: 10, required: true, multiSelect: true, maxSelect: 2 },
  shuttle: { key: 'shuttle', label: '셔틀/거리', weight: 5, required: true },
  budget: { key: 'budget', label: '예산', weight: 5, required: false },
};

// Tag options by category
export const TAG_OPTIONS: Record<string, TagOption[]> = {
  grade: [
    { key: 'grade:elem_3_4', label: '초등 3~4학년', category: 'grade' },
    { key: 'grade:elem_5_6', label: '초등 5~6학년', category: 'grade' },
    { key: 'grade:mid_1', label: '중1', category: 'grade' },
    { key: 'grade:mid_2', label: '중2', category: 'grade' },
    { key: 'grade:mid_3', label: '중3', category: 'grade' },
    { key: 'grade:high_1', label: '고1', category: 'grade' },
    { key: 'grade:high_2', label: '고2', category: 'grade' },
    { key: 'grade:high_3', label: '고3/N수', category: 'grade' },
  ],
  subject: [
    { key: 'subject:math', label: '수학', category: 'subject' },
    { key: 'subject:english', label: '영어', category: 'subject' },
    { key: 'subject:korean', label: '국어', category: 'subject' },
    { key: 'subject:science', label: '과학/탐구', category: 'subject' },
    { key: 'subject:social', label: '사회/탐구', category: 'subject' },
    { key: 'subject:coding', label: '코딩/정보', category: 'subject' },
    { key: 'subject:essay', label: '논술', category: 'subject' },
    { key: 'subject:art', label: '예체능', category: 'subject' },
  ],
  goal: [
    { key: 'goal:school_exam', label: '내신 대비', category: 'goal' },
    { key: 'goal:university', label: '수능/대입', category: 'goal' },
    { key: 'goal:competition', label: '경시/올림피아드', category: 'goal' },
    { key: 'goal:foundation', label: '기초 다지기', category: 'goal' },
    { key: 'goal:advanced', label: '선행/심화', category: 'goal' },
    { key: 'goal:habit', label: '학습 습관 형성', category: 'goal' },
  ],
  style: [
    { key: 'style:self_directed', label: '자기주도형', category: 'style' },
    { key: 'style:balanced', label: '균형형', category: 'style' },
    { key: 'style:interactive', label: '소통중심형', category: 'style' },
    { key: 'style:mentored', label: '밀착관리형', category: 'style' },
  ],
  class_size: [
    { key: 'class_size:1on1', label: '1:1 개인', category: 'class_size' },
    { key: 'class_size:small', label: '소수정예 (2~5명)', category: 'class_size' },
    { key: 'class_size:medium', label: '중규모 (6~15명)', category: 'class_size' },
    { key: 'class_size:large', label: '대형 강의 (16명+)', category: 'class_size' },
  ],
  delivery: [
    { key: 'delivery:offline', label: '오프라인', category: 'delivery' },
    { key: 'delivery:online', label: '온라인', category: 'delivery' },
    { key: 'delivery:hybrid', label: '혼합형', category: 'delivery' },
  ],
  mgmt: [
    { key: 'mgmt:homework', label: '숙제 관리', category: 'mgmt' },
    { key: 'mgmt:attendance', label: '출결 관리', category: 'mgmt' },
    { key: 'mgmt:feedback', label: '학습 피드백', category: 'mgmt' },
    { key: 'mgmt:test', label: '정기 테스트', category: 'mgmt' },
    { key: 'mgmt:counsel', label: '상담/소통', category: 'mgmt' },
  ],
  shuttle: [
    { key: 'shuttle:need', label: '셔틀 필요', category: 'shuttle' },
    { key: 'shuttle:not_need', label: '셔틀 불필요', category: 'shuttle' },
    { key: 'shuttle:walk', label: '도보 거리 선호', category: 'shuttle' },
  ],
  budget: [
    { key: 'budget:low', label: '30만원 이하', category: 'budget' },
    { key: 'budget:mid', label: '30~50만원', category: 'budget' },
    { key: 'budget:high', label: '50~80만원', category: 'budget' },
    { key: 'budget:premium', label: '80만원 이상', category: 'budget' },
  ],
};

// Get label from tag key
export const getTagLabel = (tagKey: string): string => {
  for (const category of Object.values(TAG_OPTIONS)) {
    const option = category.find(opt => opt.key === tagKey);
    if (option) return option.label;
  }
  return tagKey;
};

// Get category from tag key
export const getTagCategory = (tagKey: string): string => {
  const parts = tagKey.split(':');
  return parts[0] || '';
};

// Get all tags as flat array
export const getAllTags = (): TagOption[] => {
  return Object.values(TAG_OPTIONS).flat();
};

// Calculate match score between parent tags and academy tags
export interface MatchResult {
  score: number;
  reasons: string[];
  matchedCategories: string[];
}

export const calculateMatchScore = (
  parentTags: string[],
  academyTags: string[]
): MatchResult => {
  if (!parentTags.length || !academyTags.length) {
    return { score: 0, reasons: [], matchedCategories: [] };
  }

  let totalWeight = 0;
  let earnedWeight = 0;
  const reasons: string[] = [];
  const matchedCategories: string[] = [];

  // Group tags by category
  const parentByCategory: Record<string, string[]> = {};
  const academyByCategory: Record<string, string[]> = {};

  parentTags.forEach(tag => {
    const category = getTagCategory(tag);
    if (!parentByCategory[category]) parentByCategory[category] = [];
    parentByCategory[category].push(tag);
  });

  academyTags.forEach(tag => {
    const category = getTagCategory(tag);
    if (!academyByCategory[category]) academyByCategory[category] = [];
    academyByCategory[category].push(tag);
  });

  // Calculate score by category
  Object.entries(TAG_CATEGORIES).forEach(([categoryKey, category]) => {
    const parentCatTags = parentByCategory[categoryKey] || [];
    const academyCatTags = academyByCategory[categoryKey] || [];

    if (parentCatTags.length === 0) return; // Skip if parent didn't answer this

    totalWeight += category.weight;

    // Check for matches (intersection)
    const matches = parentCatTags.filter(tag => academyCatTags.includes(tag));
    
    if (matches.length > 0) {
      // Partial credit for multi-select categories
      const matchRatio = category.multiSelect 
        ? matches.length / parentCatTags.length 
        : 1;
      earnedWeight += category.weight * matchRatio;
      matchedCategories.push(categoryKey);

      // Add first match as reason
      const reasonLabel = getTagLabel(matches[0]);
      if (reasons.length < 3) {
        reasons.push(reasonLabel);
      }
    }
  });

  // Calculate percentage score
  let score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  // Clamp score between 50-95 to prevent over-confidence
  if (score > 0) {
    score = Math.max(50, Math.min(95, score));
  }

  // Penalize academies with very few tags
  if (academyTags.length < 3) {
    score = Math.max(0, score - 20);
  }

  return { score, reasons, matchedCategories };
};

// Test questions for parent preference test
export interface TestQuestion {
  id: string;
  question: string;
  description?: string;
  category: string;
  multiSelect: boolean;
  maxSelect?: number;
  required: boolean;
  options: TagOption[];
  skipLabel?: string;
}

export const PARENT_TEST_QUESTIONS: TestQuestion[] = [
  {
    id: 'Q1',
    question: '자녀의 학년을 선택해주세요',
    category: 'grade',
    multiSelect: false,
    required: true,
    options: TAG_OPTIONS.grade,
  },
  {
    id: 'Q2',
    question: '어떤 과목을 배우고 싶으신가요?',
    description: '최대 3개까지 선택 가능합니다',
    category: 'subject',
    multiSelect: true,
    maxSelect: 3,
    required: true,
    options: TAG_OPTIONS.subject,
  },
  {
    id: 'Q3',
    question: '학습의 주요 목표는 무엇인가요?',
    category: 'goal',
    multiSelect: false,
    required: true,
    options: TAG_OPTIONS.goal,
  },
  {
    id: 'Q4',
    question: '자녀에게 맞는 학습 스타일은?',
    description: '아이의 성향에 맞는 스타일을 선택해주세요',
    category: 'style',
    multiSelect: false,
    required: true,
    options: TAG_OPTIONS.style,
  },
  {
    id: 'Q5',
    question: '선호하는 수업 규모는?',
    category: 'class_size',
    multiSelect: false,
    required: true,
    options: TAG_OPTIONS.class_size,
  },
  {
    id: 'Q6',
    question: '수업 형태를 선택해주세요',
    category: 'delivery',
    multiSelect: false,
    required: true,
    options: TAG_OPTIONS.delivery,
  },
  {
    id: 'Q7',
    question: '중요하게 생각하는 관리 항목은?',
    description: '최대 2개까지 선택 가능합니다',
    category: 'mgmt',
    multiSelect: true,
    maxSelect: 2,
    required: true,
    options: TAG_OPTIONS.mgmt,
  },
  {
    id: 'Q8',
    question: '예산 범위를 선택해주세요',
    description: '월 기준 수업료입니다 (선택사항)',
    category: 'budget',
    multiSelect: false,
    required: false,
    skipLabel: '나중에 선택',
    options: TAG_OPTIONS.budget,
  },
];
