-- Add target_regions column to academies table
ALTER TABLE public.academies 
ADD COLUMN IF NOT EXISTS target_regions text[] DEFAULT '{}'::text[];

-- Create feed_posts table for academy news feed
CREATE TABLE public.feed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('notice', 'seminar', 'event')),
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  body TEXT CHECK (char_length(body) <= 2000),
  image_url TEXT,
  target_regions TEXT[] DEFAULT '{}'::text[],
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_likes table for user likes
CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS on feed_posts
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for feed_posts
CREATE POLICY "Anyone can view feed posts"
ON public.feed_posts
FOR SELECT
USING (true);

CREATE POLICY "Academy owners can insert feed posts"
ON public.feed_posts
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM academies
  WHERE academies.id = feed_posts.academy_id
  AND academies.owner_id = auth.uid()
));

CREATE POLICY "Academy owners can update their feed posts"
ON public.feed_posts
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM academies
  WHERE academies.id = feed_posts.academy_id
  AND academies.owner_id = auth.uid()
));

CREATE POLICY "Academy owners can delete their feed posts"
ON public.feed_posts
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM academies
  WHERE academies.id = feed_posts.academy_id
  AND academies.owner_id = auth.uid()
));

-- Enable RLS on post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_likes
CREATE POLICY "Users can view all likes"
ON public.post_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own likes"
ON public.post_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON public.post_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to increment like count
CREATE OR REPLACE FUNCTION public.increment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.feed_posts
  SET like_count = like_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to decrement like count
CREATE OR REPLACE FUNCTION public.decrement_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.feed_posts
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for like count
CREATE TRIGGER on_like_insert
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.increment_like_count();

CREATE TRIGGER on_like_delete
AFTER DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.decrement_like_count();

-- Create trigger for updated_at
CREATE TRIGGER update_feed_posts_updated_at
BEFORE UPDATE ON public.feed_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_feed_posts_academy_id ON public.feed_posts(academy_id);
CREATE INDEX idx_feed_posts_type ON public.feed_posts(type);
CREATE INDEX idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX idx_feed_posts_target_regions ON public.feed_posts USING GIN(target_regions);
CREATE INDEX idx_academies_target_regions ON public.academies USING GIN(target_regions);
CREATE INDEX idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON public.post_likes(user_id);