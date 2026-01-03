-- Allow academy owners to view parent profiles for chat rooms
CREATE POLICY "Academy owners can view parent profiles for chats"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    JOIN academies a ON cr.academy_id = a.id
    WHERE cr.parent_id = profiles.id AND a.owner_id = auth.uid()
  )
);