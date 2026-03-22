/** 개설 강좌 과목 선택 옵션 (학원 등록 대표 과목과 동일 체계) */
export const CLASS_SUBJECT_OPTIONS = [
  "수학",
  "영어",
  "국어",
  "과학",
  "사회",
  "음악",
  "미술",
  "체육",
  "코딩",
  "기타",
] as const;

/** 개설 강좌 목록 과목 필터: 전체 */
export const CLASS_SUBJECT_FILTER_ALL = "__all__";

/** 개설 강좌 목록 과목 필터: 과목 미지정 */
export const CLASS_SUBJECT_FILTER_NONE = "__none__";

/**
 * 과목 필터 SelectTrigger용 — 기본 bg-background(흰색)·그림자 제거, Radix 상태별로도 투명 유지
 */
export const CLASS_SUBJECT_FILTER_TRIGGER_CLASS =
  "!bg-transparent shadow-none border-border/50 text-foreground " +
  "hover:!bg-transparent data-[state=open]:!bg-transparent data-[state=closed]:!bg-transparent " +
  "focus:!bg-transparent focus-visible:!bg-transparent " +
  "focus:ring-1 focus:ring-ring/40 focus:ring-offset-0 focus-visible:ring-offset-0";

export function filterClassesBySubject<T extends { subject?: string | null }>(
  list: T[],
  filter: string
): T[] {
  if (filter === CLASS_SUBJECT_FILTER_ALL) return list;
  if (filter === CLASS_SUBJECT_FILTER_NONE) {
    return list.filter((c) => !c.subject?.trim());
  }
  return list.filter((c) => c.subject === filter);
}
