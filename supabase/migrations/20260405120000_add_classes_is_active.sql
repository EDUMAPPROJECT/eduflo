-- 학부모 노출 여부: false면 학원 관리 화면에서만 보이며 회색 표시, 학원 상세(학부모)에서는 숨김
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.classes.is_active IS 'true: 학부모에게 노출. false: 학원 관리 화면만, 비활성(회색) 표시';

UPDATE public.classes SET is_active = true WHERE is_active IS NULL;
