import { supabase } from "@/integrations/supabase/client";

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  like_count: number;
  is_liked?: boolean;
  parent_comment_id?: string | null;
}

export interface PostCommentWithProfile extends PostComment {
  profile: {
    image_url: string | null;
    user_name: string | null;
    role_label?: string | null;
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

export async function fetchPostComments(
  postId: string,
  currentUserId?: string | null
): Promise<PostCommentWithProfile[]> {
  const { data: comments, error } = await supabase
    .from("post_comments")
    .select("id, post_id, user_id, content, created_at, like_count, parent_comment_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const commentIds = (comments || []).map((c) => c.id);
  let likedCommentIds = new Set<string>();

  if (currentUserId && commentIds.length > 0) {
    const { data: likes } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", currentUserId)
      .in("comment_id", commentIds);
    likedCommentIds = new Set((likes || []).map((r) => r.comment_id));
  }

  const userIds = [...new Set((comments || []).map((comment) => comment.user_id))];
  let profileMap: Record<string, { user_name: string | null; image_url: string | null }> = {};
  let roleMap: Record<string, string | null> = {};

  if (userIds.length > 0) {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id, user_name, image_url").in("id", userIds),
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (rolesRes.error) throw rolesRes.error;

    profileMap = (profilesRes.data || []).reduce<Record<string, { user_name: string | null; image_url: string | null }>>((acc, profile) => {
      acc[profile.id] = { user_name: profile.user_name, image_url: profile.image_url };
      return acc;
    }, {});

    roleMap = (rolesRes.data || []).reduce<Record<string, string | null>>((acc, row) => {
      const label = row.role === "parent" ? "학부모" : row.role === "student" ? "학생" : row.role === "admin" ? "학원" : null;
      acc[row.user_id] = label ?? acc[row.user_id] ?? null;
      return acc;
    }, {});
  }

  return (comments || []).map((comment) => ({
    ...comment,
    like_count: comment.like_count ?? 0,
    is_liked: likedCommentIds.has(comment.id),
    parent_comment_id: comment.parent_comment_id ?? null,
    profile: {
      user_name: profileMap[comment.user_id]?.user_name ?? null,
      image_url: profileMap[comment.user_id]?.image_url ?? null,
      role_label: roleMap[comment.user_id] ?? null,
    },
  }));
}

export async function insertReplyComment(
  postId: string,
  parentCommentId: string,
  userId: string,
  content: string,
  profile: { user_name: string | null; image_url: string | null; role_label: string | null }
): Promise<PostCommentWithProfile> {
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      user_id: userId,
      content: content.trim(),
      parent_comment_id: parentCommentId,
    })
    .select("id, post_id, user_id, content, created_at, like_count, parent_comment_id")
    .single();

  if (error) throw error;

  return {
    ...data,
    like_count: data.like_count ?? 0,
    is_liked: false,
    profile,
  };
}

export async function toggleCommentLike(
  commentId: string,
  userId: string,
  isCurrentlyLiked: boolean
): Promise<{ like_count: number; is_liked: boolean }> {
  if (isCurrentlyLiked) {
    await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
    const { data: comment } = await supabase
      .from("post_comments")
      .select("like_count")
      .eq("id", commentId)
      .single();
    return { like_count: Math.max(0, comment?.like_count ?? 0), is_liked: false };
  } else {
    await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
    const { data: comment } = await supabase
      .from("post_comments")
      .select("like_count")
      .eq("id", commentId)
      .single();
    return { like_count: comment?.like_count ?? 0, is_liked: true };
  }
}
