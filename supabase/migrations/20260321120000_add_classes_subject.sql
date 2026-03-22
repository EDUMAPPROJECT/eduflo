-- 강좌(개설 수업)별 과목 표시용 컬럼
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS subject text;

COMMENT ON COLUMN public.classes.subject IS '개설 강좌 과목 (학원 프로필 등에서 표시)';