-- Add 'student' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';

-- Update child_connections table to support student-parent connections
-- The parent_id creates the code, and child_id (student user) enters the code to connect
ALTER TABLE public.child_connections 
ADD COLUMN IF NOT EXISTS student_user_id uuid REFERENCES auth.users(id);

-- Add RLS policy for students to view their connection requests
CREATE POLICY "Students can view connections where they are connected"
ON public.child_connections
FOR SELECT
USING (auth.uid() = student_user_id);

-- Add RLS policy for students to update their connection (to link themselves)
CREATE POLICY "Students can update pending connections to link themselves"
ON public.child_connections
FOR UPDATE
USING (status = 'pending' AND student_user_id IS NULL)
WITH CHECK (auth.uid() = student_user_id);