import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { logError } from "@/lib/errorLogger";

// Message validation schema
const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "메시지를 입력해주세요" })
    .max(5000, { message: "메시지는 5000자 이하여야 합니다" })
});

interface Message {
  id: string;
  content: string;
  sender_id: string;
  is_read: boolean;
  created_at: string;
  message_type?: string;
}

interface ChatRoomInfo {
  id: string;
  status: string;
  staff_user_id: string | null;
  academy: {
    id: string;
    name: string;
    profile_image: string | null;
    owner_id: string | null;
  };
  parent_id: string;
  parent_profile?: {
    user_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

export const useChatMessages = (chatRoomId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomInfo, setRoomInfo] = useState<ChatRoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!chatRoomId) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        setUserId(session.user.id);

        // Check if user is admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        setIsAdmin(roleData?.role === 'admin');

        // Fetch room info
        const { data: roomData, error: roomError } = await supabase
          .from('chat_rooms')
          .select(`
            id,
            parent_id,
            status,
            staff_user_id,
            academies (
              id,
              name,
              profile_image,
              owner_id
            )
          `)
          .eq('id', chatRoomId)
          .maybeSingle();

        if (roomError || !roomData) {
          logError('ChatMessages Room Fetch', roomError);
          setLoading(false);
          return;
        }

        const academy = roomData.academies as unknown as { id: string; name: string; profile_image: string | null; owner_id: string | null };
        
        // Fetch parent profile if user is admin
        let parentProfile = null;
        if (roleData?.role === 'admin') {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_name, phone, email')
            .eq('id', roomData.parent_id)
            .maybeSingle();
          parentProfile = profileData;
        }

        setRoomInfo({
          id: roomData.id,
          parent_id: roomData.parent_id,
          status: (roomData as { status?: string }).status ?? 'active',
          staff_user_id: (roomData as { staff_user_id?: string | null }).staff_user_id ?? null,
          academy: {
            id: academy.id,
            name: academy.name,
            profile_image: academy.profile_image,
            owner_id: academy.owner_id,
          },
          parent_profile: parentProfile,
        });

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_room_id', chatRoomId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          logError('ChatMessages Fetch', messagesError);
        } else {
          setMessages(messagesData || []);
        }

        // Mark messages as read
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('chat_room_id', chatRoomId)
          .neq('sender_id', session.user.id);

      } catch (error) {
        logError('ChatMessages Init', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chatRoomId]);

  // Real-time subscription
  useEffect(() => {
    if (!chatRoomId) return;

    const channel = supabase
      .channel(`messages:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Mark as read if not from current user
          if (newMessage.sender_id !== userId) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, userId]);

  // 채팅방 status 변경(강사 수락) 반영
  useEffect(() => {
    if (!chatRoomId) return;
    const channel = supabase
      .channel(`chat_room:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_rooms',
          filter: `id=eq.${chatRoomId}`,
        },
        (payload) => {
          const row = payload.new as { status?: string };
          if (row?.status === 'active') {
            setRoomInfo((prev) => (prev ? { ...prev, status: 'active' } : null));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId]);

  const sendMessage = useCallback(async (content: string): Promise<{ success: boolean; error?: string }> => {
    if (!chatRoomId || !userId || !roomInfo) {
      return { success: false, error: "채팅방 정보가 없습니다" };
    }
    if (roomInfo.status === 'pending' && roomInfo.parent_id === userId) {
      return { success: false, error: "강사가 수락할 때까지 메시지를 보낼 수 없습니다" };
    }

    // Validate message content
    const validation = messageSchema.safeParse({ content });
    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || "유효하지 않은 메시지입니다";
      logError('ChatMessages Validation', validation.error);
      return { success: false, error: errorMessage };
    }

    const validatedContent = validation.data.content;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: chatRoomId,
          sender_id: userId,
          content: validatedContent,
        });

      if (error) {
        logError('ChatMessages Send', error);
        return { success: false, error: "메시지 전송에 실패했습니다" };
      }

      // Update chat room timestamp
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatRoomId);

      return { success: true };
    } catch (error) {
      logError('ChatMessages Send', error);
      return { success: false, error: "오류가 발생했습니다" };
    }
  }, [chatRoomId, userId, roomInfo]);

  const acceptChatRequest = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!chatRoomId || !roomInfo || roomInfo.status !== 'pending') {
      return { success: false, error: "수락할 수 없는 상태입니다" };
    }
    if (userId !== roomInfo.staff_user_id) {
      return { success: false, error: "담당 강사만 수락할 수 있습니다" };
    }
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', chatRoomId);

      if (error) {
        logError('ChatMessages Accept', error);
        return { success: false, error: "수락 처리에 실패했습니다" };
      }
      setRoomInfo((prev) => (prev ? { ...prev, status: 'active' } : null));
      return { success: true };
    } catch (error) {
      logError('ChatMessages Accept', error);
      return { success: false, error: "오류가 발생했습니다" };
    }
  }, [chatRoomId, userId, roomInfo]);

  return {
    messages,
    roomInfo,
    loading,
    userId,
    isAdmin,
    sendMessage,
    acceptChatRequest,
    isStaffForThisRoom: !!roomInfo?.staff_user_id && roomInfo.staff_user_id === userId,
  };
};
