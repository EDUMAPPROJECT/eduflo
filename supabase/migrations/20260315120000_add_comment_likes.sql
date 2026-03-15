-- Add like_count to post_comments
ALTER TABLE public.post_comments
ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

-- Create comment_likes table
CREATE TABLE public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment likes"
ON public.comment_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own comment likes"
ON public.comment_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes"
ON public.comment_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Functions to update comment like_count
CREATE OR REPLACE FUNCTION public.increment_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.post_comments
  SET like_count = like_count + 1
  WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.decrement_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.post_comments
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_comment_like_insert
AFTER INSERT ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.increment_comment_like_count();

CREATE TRIGGER on_comment_like_delete
AFTER DELETE ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.decrement_comment_like_count();

CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);
