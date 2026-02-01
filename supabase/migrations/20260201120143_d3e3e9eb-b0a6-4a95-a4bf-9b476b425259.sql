-- Add member_id column to teachers table to link with academy_members
ALTER TABLE public.teachers 
ADD COLUMN member_id UUID REFERENCES public.academy_members(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.teachers.member_id IS 'Links teacher to academy member for displaying name and grade from member profile';