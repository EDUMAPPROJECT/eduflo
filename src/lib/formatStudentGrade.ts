/**
 * 상담 예약/설명회 신청 시 저장되는 학년 value(e.g. elementary-1)를
 * 화면 표시용 한글 라벨(초1, 중2 등)로 변환합니다.
 */
const GRADE_VALUE_TO_LABEL: Record<string, string> = {
  "elementary-1": "초1",
  "elementary-2": "초2",
  "elementary-3": "초3",
  "elementary-4": "초4",
  "elementary-5": "초5",
  "elementary-6": "초6",
  "middle-1": "중1",
  "middle-2": "중2",
  "middle-3": "중3",
  "high-1": "고1",
  "high-2": "고2",
  "high-3": "고3",
};

export function formatStudentGrade(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return GRADE_VALUE_TO_LABEL[value] ?? value;
}
