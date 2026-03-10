-- Update academy_members.grade semantics:
-- - Add explicit 'staff' grade for 스탭
-- - Use 'admin' grade for 원장 표시용 (필요 시)
-- - 기존 비원장 멤버의 grade가 NULL 또는 'admin'인 경우 'staff'로 마이그레이션

-- Change default grade to 'staff' for new non-owner members
ALTER TABLE public.academy_members
ALTER COLUMN grade SET DEFAULT 'staff';

-- Migrate existing non-owner members: NULL/admin -> staff
UPDATE public.academy_members
SET grade = 'staff'
WHERE role <> 'owner'
  AND (grade IS NULL OR grade = 'admin');

-- Update comment to reflect new display meanings
COMMENT ON COLUMN public.academy_members.grade IS
  'Display grade for academy member: admin(원장), vice_owner(부원장), staff(스탭), teacher(강사).';
