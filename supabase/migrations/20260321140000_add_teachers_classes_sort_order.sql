-- 강사진 / 개설 강좌 목록 표시 순서 (학원 프로필 등)
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.teachers.sort_order IS '학원 내 강사 카드 표시 순서 (작을수록 앞)';
COMMENT ON COLUMN public.classes.sort_order IS '학원 내 개설 강좌 표시 순서 (작을수록 앞)';

-- 기존 데이터: 생성일 기준으로 순서 부여
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY academy_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.teachers
)
UPDATE public.teachers t
SET sort_order = ranked.rn
FROM ranked
WHERE t.id = ranked.id;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY academy_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.classes
)
UPDATE public.classes c
SET sort_order = ranked.rn
FROM ranked
WHERE c.id = ranked.id;
