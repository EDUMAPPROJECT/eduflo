import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChatRoom {
  id: string;
  academy_id: string;
  parent_id: string;
  academy: {
    id: string;
    name: string;
    profile_image: string | null;
  };
  parent_profile?: {
    user_name: string | null;
    phone: string | null;
  } | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}

export const useChatRooms = (isAdmin: boolean = false) => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        setUserId(session.user.id);

        // Get chat rooms with academy info
        const { data: rooms, error } = await supabase
          .from('chat_rooms')
          .select(`
            id,
            academy_id,
            parent_id,
            updated_at,
            academies (
              id,
              name,
              profile_image
            )
          `)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error fetching chat rooms:', error);
          setLoading(false);
          return;
        }

        // Get last message and unread count for each room
        const roomsWithMessages = await Promise.all(
          (rooms || []).map(async (room) => {
            // Get last message
            const { data: lastMessageData } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('chat_room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // Get unread count (messages not from current user that are unread)
            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_room_id', room.id)
              .eq('is_read', false)
              .neq('sender_id', session.user.id);

            const academy = room.academies as unknown as { id: string; name: string; profile_image: string | null };

            // Fetch parent profile if admin
            let parentProfile = null;
            if (isAdmin) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('user_name, phone')
                .eq('id', room.parent_id)
                .maybeSingle();
              parentProfile = profileData;
            }

            return {
              id: room.id,
              academy_id: room.academy_id,
              parent_id: room.parent_id,
              academy: {
                id: academy.id,
                name: academy.name,
                profile_image: academy.profile_image,
              },
              parent_profile: parentProfile,
              lastMessage: lastMessageData?.content || null,
              lastMessageAt: lastMessageData?.created_at ? new Date(lastMessageData.created_at) : null,
              unreadCount: unreadCount || 0,
            };
          })
        );

        setChatRooms(roomsWithMessages);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatRooms();
  }, [isAdmin]);

  return { chatRooms, loading, userId };
};

export const useOrCreateChatRoom = () => {
  const [loading, setLoading] = useState(false);

  /**
   * 채팅방 ID를 반환합니다. 이미 있으면 기존 ID, 없으면 새로 생성합니다.
   * @param academyId 학원 ID
   * @param staffUserId 학원 담당자 user_id. 넣으면 해당 담당자와의 1:1 방을 사용합니다. 생략 시 기존처럼 학원 대표 1개 방을 사용합니다.
   */
  const getOrCreateChatRoom = async (
    academyId: string,
    staffUserId?: string | null
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return null;
      }

      const parentId = session.user.id;

      let query = supabase
        .from('chat_rooms')
        .select('id')
        .eq('academy_id', academyId)
        .eq('parent_id', parentId);

      if (staffUserId) {
        query = query.eq('staff_user_id', staffUserId);
      } else {
        query = query.is('staff_user_id', null);
      }

      const { data: existingRoom } = await query.maybeSingle();

      if (existingRoom) {
        return existingRoom.id;
      }

      const insertPayload: { academy_id: string; parent_id: string; staff_user_id?: string | null } = {
        academy_id: academyId,
        parent_id: parentId,
      };
      if (staffUserId) {
        insertPayload.staff_user_id = staffUserId;
      } else {
        insertPayload.staff_user_id = null;
      }

      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert(insertPayload)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating chat room:', error);
        return null;
      }

      return newRoom.id;
    } catch (error) {
      console.error('Error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getOrCreateChatRoom, loading };
};
