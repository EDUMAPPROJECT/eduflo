-- Allow academy members to create chat rooms with parents (e.g., from consultation reservations)

CREATE POLICY "Academy members can create chat rooms"
ON public.chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  is_academy_member(auth.uid(), academy_id)
  AND staff_user_id = auth.uid()
);