import { supabase } from "@/integrations/supabase/client";

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface PostCommentWithProfile extends PostComment {
  profile: {
    image_url: string | null;
    user_name: string | null;
  } | null;
}

export async function fetchCommentCounts(postIds: string[]): Promise<Record<string, number>> {
  if (postIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("post_comments")
    .select("post_id")
    .in("post_id", postIds);

  if (error) {
    throw error;
  }

  return (data || []).reduce<Record<string, number>>((acc, comment) => {
    acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
    return acc;
  }, {});
}

export async function fetchPostComments(postId: string): Promise<PostCommentWithProfile[]> {
  const { data: comments, error } = await supabase
    .from("post_comments")
    .select("id, post_id, user_id, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const userIds = [...new Set((comments || []).map((comment) => comment.user_id))];
  let profileMap: Record<string, { user_name: string | null; image_url: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_name, image_url")
      .in("id", userIds);

    if (profilesError) {
      throw profilesError;
    }

    profileMap = (profiles || []).reduce<Record<string, { user_name: string | null; image_url: string | null }>>((acc, profile) => {
      acc[profile.id] = {
        user_name: profile.user_name,
        image_url: profile.image_url,
      };
      return acc;
    }, {});
  }

  return (comments || []).map((comment) => ({
    ...comment,
    profile: {
      user_name: profileMap[comment.user_id]?.user_name ?? null,
      image_url: profileMap[comment.user_id]?.image_url ?? null,
    },
  }));
}
